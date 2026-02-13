import os
import sys
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("Error: No API Key found.")
    sys.exit(1)

try:
    from google import genai
    client = genai.Client(api_key=api_key)
    
    print("Enviando prompt de prueba (gemini-2.0-flash)...")
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents="Hola, responde con la palabra 'LISTO'."
    )
    print(f"Respuesta: {response.text}")
    if "LISTO" in response.text.upper():
        print("✅ CONEXIÓN EXITOSA CON GEMINI 2.0 FLASH")
        
except Exception as e:
    import traceback
    traceback.print_exc()
