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


if __name__ == "__main__":
    unittest.main()
