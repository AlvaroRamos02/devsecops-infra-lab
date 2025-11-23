# DevSecOps Infra Lab

Laboratorio personal para practicar CI/CD y seguridad (DevSecOps) con Docker, Nginx y más.

## 🛡️ Security Dashboard

Este proyecto cuenta con un dashboard estático para visualizar los resultados de los análisis de seguridad (SAST y SCA).

### 1. Generar Reportes

Para alimentar el dashboard, necesitas generar los reportes JSON y moverlos a la carpeta `dashboard/data`.

```bash
# Crear directorio de datos si no existe
mkdir -p dashboard/data

# 1. SAST - Semgrep
docker run --rm -v $(pwd):/src returntocorp/semgrep semgrep scan --config=auto --json --output=semgrep-report.json
mv semgrep-report.json dashboard/data/

# 2. SCA - Trivy Filesystem
# Nota: Usamos /src/trivy-fs-report.json para asegurar que el archivo se guarde en el volumen montado
docker run --rm -v $(pwd):/src aquasec/trivy fs /src --format json --output /src/trivy-fs-report.json
mv trivy-fs-report.json dashboard/data/

# 3. SCA - Trivy Image
# Construir y guardar la imagen primero
docker build -t myapp:latest .
docker save myapp:latest -o image.tar

docker run --rm -v $(pwd):/workspace -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image --input /workspace/image.tar --format json --output /workspace/trivy-image-report.json
mv trivy-image-report.json dashboard/data/
```

### 2. Visualizar Dashboard

Simplemente abre el archivo `dashboard/index.html` en tu navegador favorito.

```bash
# Ejemplo en Linux
xdg-open dashboard/index.html
```
