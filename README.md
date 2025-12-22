# DevSecOps Infra Lab 🛡️

Laboratorio profesional de DevSecOps para practicar CI/CD y seguridad con un dashboard centralizado y fácil de usar.

## 🚀 Características

-   **Dashboard Profesional**: Interfaz moderna (Dark Mode) con panel central de métricas.
-   **Análisis Completo**:
    -   **SAST (Código)**: Detecta vulnerabilidades en tu código fuente (Semgrep).
    -   **SCA (Dependencias)**: Analiza librerías vulnerables en tu repositorio (Trivy FS).
    -   **SCA (Imagen)**: Escanea la imagen Docker final en busca de fallos (Trivy Image).
-   **Remediación Inteligente**: Sugerencias automáticas de "Cómo solucionar" para cada hallazgo.
-   **Acceso en Red**: Accede al dashboard desde cualquier dispositivo en tu red local.

## 🛠️ Tecnologías Soportadas

Gracias a Semgrep y Trivy, este laboratorio soporta análisis de seguridad para:

-   **Lenguajes**: Python, JavaScript/TypeScript, Java, Go, Ruby, PHP, C#, etc.
-   **IaC**: Dockerfiles, Kubernetes YAML, Terraform.
-   **Secretos**: Detección de credenciales hardcodeadas.

## 📊 Acceso al Dashboard

El dashboard se despliega automáticamente en el puerto **7890** tras ejecutar el pipeline.s

### Acceso Local
👉 **[http://localhost:7890](http://localhost:7890)**

### Acceso desde la Red (LAN)
Puedes acceder desde tu móvil u otro PC usando la IP de tu máquina:
👉 **`http://<TU_IP_LOCAL>:7890`**

> **Nota**: Asegúrate de que el puerto 7890 no esté bloqueado por tu firewall.

## ⚙️ Ejecución Manual (Quick Start)

La forma más rápida de ejecutar todos los análisis y ver el dashboard:

```bash
# 1. Ejecutar análisis
./scan.sh

# 2. Levantar Dashboard
docker-compose up -d dashboard
```

Accede a: [http://localhost:7890](http://localhost:7890)


## 📝 Estructura del Proyecto

-   `.github/workflows`: Pipelines de CI/CD.
-   `dashboard/`: Código fuente del dashboard (HTML/JS/CSS).
-   `app/`: Aplicación de ejemplo vulnerable.
-   `INTEGRATION_MANUAL.md`: Guía completa de integración para clientes (GitHub, GitLab, Jenkins).

