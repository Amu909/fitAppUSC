import importlib.util
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient


def load_backend_module():
    module_path = Path(__file__).resolve().parents[1] / "app.py"
    spec = importlib.util.spec_from_file_location("backend_app", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


backend_app = load_backend_module()


class FakeResponse:
    def __init__(self, status_code=200, payload=None, text=""):
        self.status_code = status_code
        self._payload = payload or {}
        self.text = text

    def json(self):
        return self._payload


class FakeAsyncClient:
    def __init__(self, response=None, exception=None):
        self.response = response
        self.exception = exception
        self.calls = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, *args, **kwargs):
        self.calls.append((args, kwargs))
        if self.exception:
            raise self.exception
        return self.response


class ChatbotServiceTests(unittest.TestCase):
    def setUp(self):
        self.service = backend_app.ChatbotService("test-api-key")

    def test_system_prompt_mentions_core_domains(self):
        prompt = self.service.system_prompt

        self.assertIn("nutrición", prompt.lower())
        self.assertIn("fitness", prompt.lower())
        self.assertIn("salud cardiovascular", prompt.lower())

    def test_get_quick_suggestions_returns_default_options(self):
        suggestions = self.service.get_quick_suggestions()

        self.assertEqual(len(suggestions), 5)
        self.assertTrue(any("rutina" in item.lower() for item in suggestions))

    def test_get_quick_suggestions_customizes_goal(self):
        suggestions = self.service.get_quick_suggestions({"goal": "gain_muscle"})

        self.assertEqual(len(suggestions), 5)
        self.assertTrue(any("prote" in item.lower() for item in suggestions))


class SendMessageTests(unittest.IsolatedAsyncioTestCase):
    async def test_send_message_builds_context_and_uses_last_ten_messages(self):
        response = FakeResponse(
            status_code=200,
            payload={"choices": [{"message": {"content": "Respuesta de prueba"}}]},
        )
        fake_client = FakeAsyncClient(response=response)
        service = backend_app.ChatbotService("test-api-key")
        history = [
            {"role": "assistant" if i % 2 else "user", "content": f"mensaje-{i}"}
            for i in range(12)
        ]
        profile = {
            "weight": 70,
            "height": 175,
            "age": 30,
            "gender": "masculino",
            "goal": "gain_muscle",
            "activity_level": "high",
            "allergies": ["gluten"],
            "medical_conditions": ["hipertension"],
        }

        with patch.object(backend_app.httpx, "AsyncClient", return_value=fake_client):
            result = await service.send_message("Plan para hoy", history, profile)

        self.assertEqual(result, "Respuesta de prueba")
        self.assertEqual(len(fake_client.calls), 1)

        args, kwargs = fake_client.calls[0]
        self.assertEqual(args[0], backend_app.GROQ_API_URL)
        self.assertEqual(kwargs["headers"]["Authorization"], "Bearer test-api-key")
        self.assertEqual(kwargs["json"]["model"], "llama-3.3-70b-versatile")
        self.assertEqual(kwargs["timeout"], 30.0)

        messages = kwargs["json"]["messages"]
        self.assertEqual(len(messages), 12)
        self.assertIn("Peso: 70 kg", messages[0]["content"])
        self.assertIn("Alergias: gluten", messages[0]["content"])
        self.assertEqual(messages[1]["content"], "mensaje-2")
        self.assertEqual(messages[-1], {"role": "user", "content": "Plan para hoy"})

    async def test_send_message_returns_504_on_timeout(self):
        fake_client = FakeAsyncClient(
            exception=backend_app.httpx.TimeoutException("timeout")
        )
        service = backend_app.ChatbotService("test-api-key")

        with patch.object(backend_app.httpx, "AsyncClient", return_value=fake_client):
            with self.assertRaises(backend_app.HTTPException) as ctx:
                await service.send_message("Hola", [], None)

        self.assertEqual(ctx.exception.status_code, 504)
        self.assertIn("Timeout", ctx.exception.detail)

    async def test_send_message_preserves_upstream_http_status(self):
        response = FakeResponse(status_code=429, text="rate limited")
        fake_client = FakeAsyncClient(response=response)
        service = backend_app.ChatbotService("test-api-key")

        with patch.object(backend_app.httpx, "AsyncClient", return_value=fake_client):
            with self.assertRaises(backend_app.HTTPException) as ctx:
                await service.send_message("Hola", [], None)

        self.assertEqual(ctx.exception.status_code, 429)
        self.assertIn("Groq", ctx.exception.detail)


class ApiEndpointTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(backend_app.app)

    @patch.object(backend_app.chatbot, "get_quick_suggestions")
    @patch.object(backend_app.chatbot, "send_message", new_callable=AsyncMock)
    def test_chat_endpoint_returns_response_suggestions_and_timestamp(
        self, send_message_mock, suggestions_mock
    ):
        send_message_mock.return_value = "Respuesta generada"
        suggestions_mock.return_value = ["A", "B"]

        response = self.client.post(
            "/chat",
            json={
                "message": "Necesito ayuda",
                "conversation_history": [{"role": "user", "content": "Hola"}],
                "user_profile": {"goal": "lose_weight"},
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["response"], "Respuesta generada")
        self.assertEqual(payload["suggestions"], ["A", "B"])
        self.assertIn("timestamp", payload)
        send_message_mock.assert_awaited_once()
        suggestions_mock.assert_called_once_with({"goal": "lose_weight"})

    @patch.object(backend_app.chatbot, "send_message", new_callable=AsyncMock)
    def test_chat_endpoint_preserves_http_exception_status(self, send_message_mock):
        send_message_mock.side_effect = backend_app.HTTPException(
            status_code=504, detail="Timeout al conectar con Groq"
        )

        response = self.client.post(
            "/chat",
            json={"message": "Necesito ayuda", "conversation_history": []},
        )

        self.assertEqual(response.status_code, 504)
        self.assertEqual(response.json()["detail"], "Timeout al conectar con Groq")

    def test_suggestions_endpoint_uses_goal_filters(self):
        response = self.client.get("/chat/suggestions", params={"goal": "athletic"})

        self.assertEqual(response.status_code, 200)
        suggestions = response.json()["suggestions"]
        self.assertEqual(len(suggestions), 5)
        self.assertTrue(any("hiit" in item.lower() for item in suggestions))

    @patch.object(backend_app.chatbot, "send_message", new_callable=AsyncMock)
    def test_module_assistant_uses_profile_and_module_context(self, send_message_mock):
        send_message_mock.return_value = "Rutina personalizada"

        response = self.client.post(
            "/ai/module-assistant",
            json={
                "module": "Rutinas",
                "intent": "Genera una rutina semanal",
                "user_profile": {"goal": "gain_muscle", "isVegetarian": True},
                "module_data": {"grupo": "Piernas", "dias": 4},
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["insight"], "Rutina personalizada")
        awaited_kwargs = send_message_mock.await_args.kwargs
        self.assertEqual(
            awaited_kwargs["user_profile"],
            {"goal": "gain_muscle", "isVegetarian": True},
        )
        self.assertIn("Rutinas", awaited_kwargs["user_message"])
        self.assertIn('"grupo": "Piernas"', awaited_kwargs["user_message"])

    def test_integrated_nutrition_plan_uses_food_dataset(self):
        response = self.client.post(
            "/generate-comprehensive-plan",
            json={
                "weight": 74,
                "height": 176,
                "age": 30,
                "gender": "male",
                "activity_level": "moderate",
                "goal": "athletic",
                "allergies": [],
                "preferences": [],
                "medical_conditions": [],
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("desayuno", payload["plan_alimentario"])
        self.assertGreater(payload["dataset"]["alimentos_evaluados"], 0)
        self.assertEqual(payload["dataset"]["fuente"], "Food_and_Nutrition.csv")
        self.assertIn("contexto_dieta", payload)
        self.assertIn("enfoque_principal", payload["contexto_dieta"])

    def test_integrated_nutrition_plan_balances_main_meals_by_role(self):
        response = self.client.post(
            "/generate-comprehensive-plan",
            json={
                "weight": 74,
                "height": 176,
                "age": 30,
                "gender": "male",
                "activity_level": "moderate",
                "goal": "maintain",
                "allergies": [],
                "preferences": [],
                "medical_conditions": [],
            },
        )

        self.assertEqual(response.status_code, 200)
        meals = response.json()["plan_alimentario"]

        for meal_name in ("desayuno", "almuerzo", "cena"):
            foods = meals[meal_name]
            categories = {item["category"].lower() for item in foods}

            self.assertTrue(
                any(backend_app.food_matches_role(item, "protein") for item in foods),
                f"{meal_name} debe incluir una fuente proteica",
            )
            self.assertTrue(
                any(backend_app.food_matches_role(item, "complex_carb") for item in foods),
                f"{meal_name} debe incluir un carbohidrato complejo o vegetal estructural",
            )
            self.assertFalse(
                categories.issubset({"fruits", "beverages"}),
                f"{meal_name} no debe quedar compuesto solo por frutas o bebidas",
            )

    def test_build_meal_plan_avoids_snack_or_beverage_only_lunch(self):
        foods = [
            {"food": "Apple Juice", "category": "Beverages", "meal_type": "Lunch", "calories_per_100g": 120, "protein": 1, "carbs": 24, "fat": 0, "fiber": 0, "sugars": 20, "sodium": 12, "cholesterol": 0, "water_intake": 200},
            {"food": "Cookies", "category": "Snacks", "meal_type": "Lunch", "calories_per_100g": 210, "protein": 3, "carbs": 30, "fat": 8, "fiber": 1, "sugars": 18, "sodium": 130, "cholesterol": 0, "water_intake": 30},
            {"food": "Chicken Breast", "category": "Meat", "meal_type": "Lunch", "calories_per_100g": 180, "protein": 31, "carbs": 0, "fat": 4, "fiber": 0, "sugars": 0, "sodium": 90, "cholesterol": 70, "water_intake": 0},
            {"food": "Rice", "category": "Grains", "meal_type": "Lunch", "calories_per_100g": 130, "protein": 3, "carbs": 28, "fat": 1, "fiber": 2, "sugars": 0, "sodium": 5, "cholesterol": 0, "water_intake": 0},
            {"food": "Broccoli", "category": "Vegetables", "meal_type": "Lunch", "calories_per_100g": 55, "protein": 4, "carbs": 11, "fat": 0.5, "fiber": 4, "sugars": 2, "sodium": 30, "cholesterol": 0, "water_intake": 0},
        ]

        plan = backend_app.build_meal_plan(foods, 2200)
        lunch = plan["almuerzo"]
        lunch_names = {item["food"] for item in lunch}

        self.assertIn("Chicken Breast", lunch_names)
        self.assertIn("Rice", lunch_names)
        self.assertTrue(any(item["category"] == "Vegetables" for item in lunch))

    def test_build_meal_plan_discourages_breakfast_like_lunch_combos(self):
        foods = [
            {"food": "Bread", "category": "Grains", "meal_type": "Lunch", "calories_per_100g": 292, "protein": 12, "carbs": 47.3, "fat": 6.1, "fiber": 3, "sugars": 5, "sodium": 120, "cholesterol": 0, "water_intake": 20},
            {"food": "Yogurt", "category": "Dairy", "meal_type": "Lunch", "calories_per_100g": 292, "protein": 40.9, "carbs": 72.1, "fat": 38.4, "fiber": 0.5, "sugars": 8, "sodium": 90, "cholesterol": 15, "water_intake": 30},
            {"food": "Rice", "category": "Grains", "meal_type": "Lunch", "calories_per_100g": 293, "protein": 37.5, "carbs": 27.4, "fat": 3.3, "fiber": 2.4, "sugars": 1, "sodium": 10, "cholesterol": 0, "water_intake": 0},
            {"food": "Beef Steak", "category": "Meat", "meal_type": "Lunch", "calories_per_100g": 294, "protein": 36.0, "carbs": 0, "fat": 9.4, "fiber": 0, "sugars": 0, "sodium": 80, "cholesterol": 65, "water_intake": 0},
            {"food": "Broccoli", "category": "Vegetables", "meal_type": "Lunch", "calories_per_100g": 95, "protein": 8.0, "carbs": 14.0, "fat": 1.1, "fiber": 5.0, "sugars": 2, "sodium": 25, "cholesterol": 0, "water_intake": 0},
        ]

        plan = backend_app.build_meal_plan(foods, 2200)
        lunch_names = {item["food"] for item in plan["almuerzo"]}

        self.assertIn("Beef Steak", lunch_names)
        self.assertIn("Rice", lunch_names)
        self.assertIn("Broccoli", lunch_names)
        self.assertNotIn("Yogurt", lunch_names)

    def test_food_catalog_returns_dataset_items(self):
        response = self.client.get("/nutrition/foods", params={"limit": 5})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertLessEqual(len(payload["foods"]), 5)
        self.assertIn("categories", payload)

    @patch.object(backend_app.chatbot, "send_message", new_callable=AsyncMock)
    def test_analyze_routine_endpoint_builds_analysis_prompt(self, send_message_mock):
        send_message_mock.return_value = "Buen balance"
        routine = {"days": 4, "focus": "cardio"}

        response = self.client.post("/chat/analyze-routine", json=routine)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["analysis"], "Buen balance")
        awaited_kwargs = send_message_mock.await_args.kwargs
        self.assertIn("Analiza esta rutina", awaited_kwargs["user_message"])
        self.assertIn('"focus": "cardio"', awaited_kwargs["user_message"])

    @patch.object(backend_app.chatbot, "send_message", new_callable=AsyncMock)
    def test_meal_plan_review_endpoint_passes_user_profile(self, send_message_mock):
        send_message_mock.return_value = "Plan equilibrado"
        meal_data = {
            "breakfast": ["huevos", "avena"],
            "user_profile": {"goal": "gain_muscle"},
        }

        response = self.client.post("/chat/meal-plan-review", json=meal_data)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["review"], "Plan equilibrado")
        awaited_kwargs = send_message_mock.await_args.kwargs
        self.assertEqual(awaited_kwargs["user_profile"], {"goal": "gain_muscle"})

    def test_health_endpoint_reports_service_capabilities(self):
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "Chatbot Nutricional funcionando")
        self.assertIn("Rutinas de ejercicio", payload["capabilities"])
        self.assertIn("ai_configured", payload)

    def test_ai_status_endpoint_reports_configuration(self):
        response = self.client.get("/ai/status")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["provider"], "Groq")
        self.assertIn("configured", payload)
        self.assertIn("/chat", payload["available_endpoints"])


if __name__ == "__main__":
    unittest.main()
