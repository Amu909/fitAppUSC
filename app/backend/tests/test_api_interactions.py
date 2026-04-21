import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient


def load_module(module_name, relative_path):
    module_path = (Path(__file__).resolve().parents[2] / relative_path).resolve()
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


chat_api = load_module("chat_api_module", Path("backend") / "app.py")
recetas_api = load_module("recetas_api_module", Path("..") / "recetas_api.py")


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


class ChatApiInteractionTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(chat_api.app)

    def test_chat_endpoint_interacts_with_provider_and_returns_contract(self):
        fake_provider = FakeAsyncClient(
            response=FakeResponse(
                status_code=200,
                payload={"choices": [{"message": {"content": "Aquí tienes tu plan."}}]},
            )
        )

        payload = {
            "message": "Quiero mejorar mi cardio",
            "conversation_history": [
                {"role": "user", "content": "Hola"},
                {"role": "assistant", "content": "¿Cuál es tu objetivo?"},
            ],
            "user_profile": {
                "weight": 74,
                "height": 176,
                "age": 30,
                "gender": "male",
                "goal": "athletic",
                "activity_level": "active",
            },
        }

        with patch.object(chat_api.httpx, "AsyncClient", return_value=fake_provider):
            response = self.client.post("/chat", json=payload)

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["response"], "Aquí tienes tu plan.")
        self.assertEqual(len(body["suggestions"]), 5)
        self.assertIn("timestamp", body)

        self.assertEqual(len(fake_provider.calls), 1)
        _, kwargs = fake_provider.calls[0]
        provider_messages = kwargs["json"]["messages"]
        self.assertEqual(provider_messages[-1]["content"], "Quiero mejorar mi cardio")
        self.assertIn("Objetivo: athletic", provider_messages[0]["content"])

    def test_analyze_routine_endpoint_interacts_with_provider(self):
        fake_provider = FakeAsyncClient(
            response=FakeResponse(
                status_code=200,
                payload={"choices": [{"message": {"content": "Rutina balanceada."}}]},
            )
        )

        with patch.object(chat_api.httpx, "AsyncClient", return_value=fake_provider):
            response = self.client.post(
                "/chat/analyze-routine",
                json={"days": 3, "focus": "strength", "duration_minutes": 45},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["analysis"], "Rutina balanceada.")
        _, kwargs = fake_provider.calls[0]
        self.assertIn("Analiza esta rutina", kwargs["json"]["messages"][-1]["content"])
        self.assertIn('"focus": "strength"', kwargs["json"]["messages"][-1]["content"])

    def test_meal_plan_review_endpoint_interacts_with_provider(self):
        fake_provider = FakeAsyncClient(
            response=FakeResponse(
                status_code=200,
                payload={"choices": [{"message": {"content": "Buen reparto de macros."}}]},
            )
        )

        meal_plan = {
            "breakfast": ["avena", "yogur"],
            "lunch": ["pollo", "arroz"],
            "user_profile": {"goal": "gain_muscle", "activity_level": "moderate"},
        }

        with patch.object(chat_api.httpx, "AsyncClient", return_value=fake_provider):
            response = self.client.post("/chat/meal-plan-review", json=meal_plan)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["review"], "Buen reparto de macros.")
        _, kwargs = fake_provider.calls[0]
        self.assertIn("Plan de Comidas", kwargs["json"]["messages"][-1]["content"])
        self.assertIn("objetivo: gain_muscle", kwargs["json"]["messages"][0]["content"].lower())

    def test_chat_timeout_is_propagated_as_gateway_timeout(self):
        fake_provider = FakeAsyncClient(
            exception=chat_api.httpx.TimeoutException("timeout")
        )

        with patch.object(chat_api.httpx, "AsyncClient", return_value=fake_provider):
            response = self.client.post(
                "/chat", json={"message": "Hola", "conversation_history": []}
            )

        self.assertEqual(response.status_code, 504)
        self.assertIn("Timeout", response.json()["detail"])


class NutritionApiInteractionTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(recetas_api.app)

    def test_generate_comprehensive_plan_returns_complete_contract(self):
        response = self.client.post(
            "/generate-comprehensive-plan",
            json={
                "weight": 82,
                "height": 180,
                "age": 34,
                "gender": "male",
                "activity_level": "moderate",
                "goal": "maintain",
                "allergies": ["gluten"],
                "preferences": ["pollo", "quinoa"],
                "medical_conditions": [],
                "body_fat_percentage": 18,
                "waist_circumference": 86,
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("analisis_corporal", payload)
        self.assertIn("metabolismo", payload)
        self.assertIn("macronutrientes", payload)
        self.assertIn("plan_alimentario", payload)
        self.assertIn("evaluacion_salud", payload)
        self.assertIn("predicciones", payload)
        self.assertGreater(payload["metabolismo"]["calorias_objetivo"], 0)
        self.assertIn("desayuno", payload["plan_alimentario"])

    def test_generate_comprehensive_plan_handles_diabetes_profile(self):
        response = self.client.post(
            "/generate-comprehensive-plan",
            json={
                "weight": 90,
                "height": 169,
                "age": 58,
                "gender": "female",
                "activity_level": "light",
                "goal": "lose_weight",
                "allergies": [],
                "preferences": ["verduras", "pescado"],
                "medical_conditions": ["diabetes"],
                "body_fat_percentage": None,
                "waist_circumference": 95,
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        recomendaciones = payload["evaluacion_salud"]["recomendaciones_especificas"]
        self.assertTrue(
            any("gluc" in recomendacion.lower() for recomendacion in recomendaciones)
        )
        self.assertEqual(payload["predicciones"]["adherencia_requerida"], "Moderada")

    def test_generate_comprehensive_plan_rejects_invalid_payload(self):
        response = self.client.post(
            "/generate-comprehensive-plan",
            json={
                "weight": 20,
                "height": 90,
                "age": 10,
                "gender": "male",
                "activity_level": "moderate",
                "goal": "maintain",
                "allergies": [],
                "preferences": [],
                "medical_conditions": [],
            },
        )

        self.assertEqual(response.status_code, 422)
        details = response.json()["detail"]
        self.assertGreaterEqual(len(details), 3)

    def test_health_endpoints_are_reachable(self):
        chat_health = self.client.get("/health")

        self.assertEqual(chat_health.status_code, 200)
        self.assertIn("funcionando", chat_health.json()["status"].lower())


if __name__ == "__main__":
    unittest.main()
