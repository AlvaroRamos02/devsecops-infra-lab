import os

# Código deliberadamente feo para que Semgrep se queje
user_input = input("Introduce algo: ")
eval(user_input)  # Inyección de código a propósito

API_KEY = "123456-super-insegura"  # Para que las reglas de secrets se activen

print("Hola desde la app de prueba DevSecOps")
