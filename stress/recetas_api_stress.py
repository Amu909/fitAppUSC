import argparse
import asyncio
import importlib.util
import statistics
import time
from pathlib import Path

import httpx


def load_recetas_module():
    module_path = Path(__file__).resolve().parents[1] / "recetas_api.py"
    spec = importlib.util.spec_from_file_location("recetas_api_module", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def percentile(values, ratio):
    if not values:
        return 0.0
    ordered = sorted(values)
    index = int((len(ordered) - 1) * ratio)
    return ordered[index]


async def timed_post(client, payload):
    started = time.perf_counter()
    response = await client.post("/generate-comprehensive-plan", json=payload)
    elapsed = (time.perf_counter() - started) * 1000
    return response.status_code, elapsed


async def run_scenario(name, payload, total_requests, concurrency):
    recetas_api = load_recetas_module()
    transport = httpx.ASGITransport(app=recetas_api.app)
    semaphore = asyncio.Semaphore(concurrency)
    durations = []
    status_codes = []

    async with httpx.AsyncClient(transport=transport, base_url="http://stress.local") as client:
        async def worker():
            async with semaphore:
                status_code, elapsed = await timed_post(client, payload)
                status_codes.append(status_code)
                durations.append(elapsed)

        started = time.perf_counter()
        await asyncio.gather(*(worker() for _ in range(total_requests)))
        total_elapsed = (time.perf_counter() - started) * 1000

    success_count = sum(1 for code in status_codes if code == 200)
    throughput = total_requests / (total_elapsed / 1000)

    return {
        "name": name,
        "total_requests": total_requests,
        "success_count": success_count,
        "failure_count": total_requests - success_count,
        "total_elapsed": total_elapsed,
        "throughput": throughput,
        "avg_latency": statistics.mean(durations) if durations else 0.0,
        "p95_latency": percentile(durations, 0.95),
        "max_latency": max(durations) if durations else 0.0,
    }


def print_result(result):
    status = "PASS" if result["failure_count"] == 0 else "FAIL"
    print(f"{status} {result['name']}")
    print(f"  requests {result['success_count']}/{result['total_requests']} OK")
    print(f"  concurrency configurada")
    print(f"  tiempo total {result['total_elapsed']:.2f} ms")
    print(f"  latencia promedio {result['avg_latency']:.2f} ms")
    print(f"  latencia p95 {result['p95_latency']:.2f} ms")
    print(f"  latencia maxima {result['max_latency']:.2f} ms")
    print(f"  throughput {result['throughput']:.2f} req/s")


async def main():
    parser = argparse.ArgumentParser(description="Stress test para recetas_api.py")
    parser.add_argument("--requests", type=int, default=60)
    parser.add_argument("--concurrency", type=int, default=12)
    args = parser.parse_args()

    scenarios = [
        (
            "stress/python recetas_api maintain plan",
            {
                "weight": 72,
                "height": 175,
                "age": 29,
                "gender": "male",
                "activity_level": "moderate",
                "goal": "maintain",
                "allergies": [],
                "preferences": ["pollo", "avena"],
                "medical_conditions": [],
                "body_fat_percentage": 18,
                "waist_circumference": 84,
            },
        ),
        (
            "stress/python recetas_api lose_weight diabetic",
            {
                "weight": 91,
                "height": 168,
                "age": 54,
                "gender": "female",
                "activity_level": "light",
                "goal": "lose_weight",
                "allergies": ["gluten"],
                "preferences": ["verduras", "pescado"],
                "medical_conditions": ["diabetes"],
                "body_fat_percentage": None,
                "waist_circumference": 96,
            },
        ),
        (
            "stress/python recetas_api athletic plan",
            {
                "weight": 78,
                "height": 182,
                "age": 33,
                "gender": "male",
                "activity_level": "very_active",
                "goal": "athletic",
                "allergies": ["soy"],
                "preferences": ["arroz", "huevos", "frutas"],
                "medical_conditions": [],
                "body_fat_percentage": 12,
                "waist_circumference": 81,
            },
        ),
    ]

    results = []
    for name, payload in scenarios:
        result = await run_scenario(name, payload, args.requests, args.concurrency)
        results.append(result)
        print_result(result)

    print("")
    print(f"Stress Suites: {sum(1 for item in results if item['failure_count'] == 0)} passed, {len(results)} total")
    print(f"Requests: {sum(item['success_count'] for item in results)} passed, {sum(item['total_requests'] for item in results)} total")
    print(f"Tiempo agregado: {sum(item['total_elapsed'] for item in results):.2f} ms")


if __name__ == "__main__":
    asyncio.run(main())
