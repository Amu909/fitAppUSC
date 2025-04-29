# recetas_api.py
from fastapi import FastAPI
import pandas as pd

app = FastAPI()

# Cargar recetas desde un CSV o archivo JSON
df = pd.read_csv("Food_and_Nutrition.csv")

@app.get("/recetas")
def get_recetas():
    return df.to_dict(orient="records")
