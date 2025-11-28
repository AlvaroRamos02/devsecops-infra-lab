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

El dashboard se despliega automáticamente en el puerto **7888** tras ejecutar el pipeline.

### Acceso Local
👉 **[http://localhost:7888](http://localhost:7888)**

### Acceso desde la Red (LAN)
Puedes acceder desde tu móvil u otro PC usando la IP de tu máquina:
👉 **`http://<TU_IP_LOCAL>:7888`**

> **Nota**: Asegúrate de que el puerto 7888 no esté bloqueado por tu firewall.

## ⚙️ Ejecución Manual

Si ya tienes los reportes generados en `dashboard/data`, puedes levantar solo el dashboard:

```bash
docker-compose up -d dashboard
```

## 📝 Estructura del Proyecto

-   `.github/workflows`: Pipelines de CI/CD.
-   `dashboard/`: Código fuente del dashboard (HTML/JS/CSS).
-   `app/`: Aplicación de ejemplo vulnerable.

