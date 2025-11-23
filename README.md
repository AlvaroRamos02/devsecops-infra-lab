# DevSecOps Infra Lab

Laboratorio personal para practicar CI/CD y seguridad (DevSecOps) con Docker, Nginx y más.

## 🛡️ Security Dashboard

Este proyecto cuenta con un dashboard automatizado para visualizar los resultados de los análisis de seguridad (SAST y SCA).

### Automatización

El dashboard se genera y despliega automáticamente cada vez que se ejecuta el pipeline de CI/CD (GitHub Actions).

1.  **Generación de Reportes**: El pipeline ejecuta Semgrep y Trivy, generando los archivos JSON necesarios.
2.  **Despliegue**: Al finalizar el análisis, se levanta un contenedor Docker que sirve el dashboard en el puerto **7888**.

### Acceso

Una vez que el job ha finalizado, puedes acceder al dashboard en:

👉 **[http://localhost:7888](http://localhost:7888)**

### Ejecución Manual (Opcional)

Si deseas levantar el dashboard manualmente sin ejecutar todo el pipeline (asumiendo que ya tienes los datos en `dashboard/data`):

```bash
docker-compose up -d dashboard
```
