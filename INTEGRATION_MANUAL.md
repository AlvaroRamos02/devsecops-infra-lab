# 📘 Manual de Integración del Dashboard DevSecOps

Este manual describe cómo integrar el **Security Dashboard** en diferentes entornos de CI/CD y flujos de trabajo. El objetivo es generar los reportes de seguridad (SAST y SCA) y visualizar los resultados en el dashboard centralizado.

## 📋 Prerrequisitos

Para cualquier integración, el cliente necesita:
1.  **Docker**: Para ejecutar los escáneres (Semgrep, Trivy) y el contenedor del dashboard.
2.  **Acceso al Código Fuente**: El pipeline debe tener acceso al repositorio que se va a analizar.

---

## 🚀 Escenario 1: GitHub Actions (Nativo)

Este es el escenario por defecto del proyecto.

### 1. Copiar el Workflow
Copia el archivo `.github/workflows/build-docker.yml` a tu repositorio en la misma ruta.

### 2. Estructura de Carpetas
Asegúrate de que tu repositorio tenga la carpeta `dashboard/` con el código fuente del dashboard (HTML, JS, CSS).

### 3. Ejecución
El pipeline se ejecutará automáticamente en cada `push` a la rama `main`.
-   **Generación**: Los jobs `sast`, `sca-fs` y `sca-image` generarán los JSON.
-   **Despliegue**: El job `dashboard` descargará los artefactos y levantará el contenedor en el puerto `7890`.

---

## 🦊 Escenario 2: GitLab CI

Para integrar en GitLab, crea un archivo `.gitlab-ci.yml`:

```yaml
stages:
  - test
  - dashboard

sast_scan:
  stage: test
  image: returntocorp/semgrep
  script:
    - semgrep scan --config=auto --json --output=semgrep-report.json
  artifacts:
    paths: [semgrep-report.json]

sca_scan:
  stage: test
  image: aquasec/trivy
  script:
    - trivy fs . --format json --output trivy-fs-report.json
  artifacts:
    paths: [trivy-fs-report.json]

deploy_dashboard:
  stage: dashboard
  image: docker:latest
  services:
    - docker:dind
  script:
    - mkdir -p dashboard/data
    - mv semgrep-report.json dashboard/data/
    - mv trivy-fs-report.json dashboard/data/
    # Asumiendo que tienes un docker-compose.yml compatible
    - docker-compose up -d dashboard
  tags:
    - self-hosted # Necesario para ejecutar docker-compose localmente
```

---

## 🤵 Escenario 3: Jenkins

En un `Jenkinsfile` (Pipeline declarativo):

```groovy
pipeline {
    agent any
    stages {
        stage('Security Scan') {
            steps {
                sh 'docker run --rm -v $(pwd):/src returntocorp/semgrep semgrep scan --config=auto --json --output=/src/dashboard/data/semgrep-report.json'
                sh 'docker run --rm -v $(pwd):/src aquasec/trivy fs /src --format json --output /src/dashboard/data/trivy-fs-report.json'
            }
        }
        stage('Deploy Dashboard') {
            steps {
                sh 'docker-compose up -d dashboard'
            }
        }
    }
}
```

---

## 💻 Escenario 4: Ejecución Local (Manual)

Ideal para pruebas rápidas o demostraciones en la máquina del desarrollador.

### 1. Generar Reportes
Ejecuta los siguientes comandos desde la raíz del proyecto:

**SAST (Semgrep):**
```bash
docker run --rm -v $(pwd):/src returntocorp/semgrep semgrep scan --config=auto --json --output=/src/dashboard/data/semgrep-report.json
```

**SCA (Trivy):**
```bash
docker run --rm -v $(pwd):/src aquasec/trivy fs /src --format json --output /src/dashboard/data/trivy-fs-report.json
```

### 2. Levantar Dashboard
```bash
docker-compose up -d dashboard
```

### 3. Acceder
Abre tu navegador en: [http://localhost:7890](http://localhost:7890)

---

## ⚙️ Personalización

### Cambiar el Puerto
Si el puerto `7890` está ocupado, edita el archivo `docker-compose.yml`:

```yaml
ports:
  - "8080:80" # Cambia 7890 por el puerto que desees (ej. 8080)
```

### Persistencia de Datos
Por defecto, el dashboard lee los archivos JSON del momento. Si reinicias el contenedor, leerá lo que haya en la carpeta `dashboard/data` en ese instante. No utiliza base de datos, lo que lo hace ligero y fácil de mantener.
