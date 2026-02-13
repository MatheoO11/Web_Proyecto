"""
Test script for AI Evaluation Personalization

This script simulates calling the generar-evaluacion endpoint
with different student profiles to verify personalization works.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from courses.models import Recurso
from evaluaciones.models import SesionAtencion, ResultadoD2R
from datetime import datetime, timedelta

User = get_user_model()

def setup_test_data():
    """Create test users with different attention/D2R profiles"""
    
    # Student 1: Low attention, low concentration
    user1, _ = User.objects.get_or_create(
        email="student_low@test.com",
        defaults={"username": "student_low", "rol": "estudiante"}
    )
    
    # Create low attention sessions
    recurso = Recurso.objects.first()
    if recurso:
        for i in range(5):
            SesionAtencion.objects.get_or_create(
                estudiante=user1,
                recurso=recurso,
                defaults={
                    "porcentaje_atencion": 35 + i*2,  # 35-43%
                    "duracion_total": 300,
                    "segundos_distraido": 180,
                    "nivel": "baja"
                }
            )
    
    # Create low D2R result
    ResultadoD2R.objects.get_or_create(
        estudiante=user1,
        defaults={
            "con": 45,  # Low concentration
            "tot": 120,
            "var": 15,
            "tr_total": 180,
            "ta_total": 120,
            "eo_total": 15,
            "ec_total": 8
        }
    )
    
    # Student 2: High attention, high concentration
    user2, _ = User.objects.get_or_create(
        email="student_high@test.com",
        defaults={"username": "student_high", "rol": "estudiante"}
    )
    
    if recurso:
        for i in range(5):
            SesionAtencion.objects.get_or_create(
                estudiante=user2,
                recurso=recurso,
                defaults={
                    "porcentaje_atencion": 82 + i,  # 82-86%
                    "duracion_total": 300,
                    "segundos_distraido": 45,
                    "nivel": "alta"
                }
            )
    
    ResultadoD2R.objects.get_or_create(
        estudiante=user2,
        defaults={
            "con": 145,  # High concentration
            "tot": 180,
            "var": 5,
            "tr_total": 210,
            "ta_total": 180,
            "eo_total": 3,
            "ec_total": 2
        }
    )
    
    return user1, user2, recurso


def test_personalization():
    print("="*60)
    print("TESTING AI EVALUATION PERSONALIZATION")
    print("="*60)
    
    user1, user2, recurso = setup_test_data()
    
    if not recurso:
        print("[ERROR] No resources found. Create a course first.")
        return
    
    print(f"\nTest Resource: {recurso.titulo}")
    print("\n" + "="*60)
    
    # Test Student 1 (Low attention/concentration)
    print("\n[TEST 1] Low Attention Student Profile")
    print("-"*60)
    print(f"User: {user1.email}")
    
    from courses.views_evaluaciones import calcular_nivel_atencion, obtener_contexto_d2r
    nivel1, prom1 = calcular_nivel_atencion(user1)
    d2r1 = obtener_contexto_d2r(user1)
    
    print(f"Attention Level: {nivel1} ({prom1}%)")
    print(f"D2R Concentration: {d2r1.get('con', 'N/A')}")
    print(f"Expected: Simple, direct questions")
    
    # Test Student 2 (High attention/concentration)
    print("\n[TEST 2] High Attention Student Profile")
    print("-"*60)
    print(f"User: {user2.email}")
    
    nivel2, prom2 = calcular_nivel_atencion(user2)
    d2r2 = obtener_contexto_d2r(user2)
    
    print(f"Attention Level: {nivel2} ({prom2}%)")
    print(f"D2R Concentration: {d2r2.get('con', 'N/A')}")
    print(f"Expected: More complex, analytical questions")
    
    print("\n" + "="*60)
    print("[INFO] To test the endpoint:")
    print("-"*60)
    print(f"POST /api/generar-evaluacion/")
    print(f'  Headers: Authorization: Token <your-token>')
    print(f'  Body: {{"recurso_id": {recurso.id}}}')
    print("\n[INFO] Check that the contexto_atencion.mensaje reflects")
    print("       the student's profile and questions are adapted.")
    print("="*60)


if __name__ == "__main__":
    test_personalization()
