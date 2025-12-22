# DevSecOps Infra Lab 🛡️

**Integración de Seguridad Automatizada para tu Proyecto.**

Este repositorio está diseñado para ser integrado directamente en tu flujo de trabajo. Convierte cualquier aplicación en una aplicación segura analizando código y dependencias automáticamente en cada push.

---

## 📂 Estructura Simple

Solo necesitas preocuparte por 3 carpetas:

-   `app/` 👉 **TU CÓDIGO**. Pon aquí tu proyecto (Node.js, Python, Java, etc.).
-   `dashboard/` 👉 **VISUALIZACIÓN**. Panel web local para ver tus resultados.
-   `.github/` 👉 **AUTOMATIZACIÓN**. Define que la seguridad se ejecute sola.

---

## 🚀 Cómo Empezar

### 1. Pon tu código
Simplemente copia el código fuente de tu aplicación dentro de la carpeta `app/`.

### 2. Sube a GitHub
Haz tus commits y push de forma normal.
```bash
git add .
git commit -m "feat: mi nueva app segura"
git push origin main
```

**¡Eso es todo!** GitHub Actions detectará el cambio y ejecutará automáticamente:
1.  **SAST** (Semgrep): Busca vulnerabilidades en tu código.
2.  **SCA** (Trivy): Busca librerías viejas o peligrosas.
3.  **Reporte PDF**: Genera un informe profesional con los hallazgos.

---

## � Flujo Automático

Cuando haces `git push`:
1.  GitHub Actions ejecuta los análisis de seguridad.
2.  Si encuetra nuevos vulnerabilidades, **el bot actualiza los archivos JSON en el repositorio automáticamente**.
3.  Tú recibes los resultados haciendo `git pull`.

---


## ⚡ Modo "Magic Sync" (Opcional)

Si quieres que **tu dashboard local se actualice solo** sin tener que hacer `git pull`, debes configurar tu ordenador como un **Self-Hosted Runner**.

1.  Ve a tu repo en GitHub -> Settings -> Actions -> Runners -> New self-hosted runner.
2.  Sigue las instrucciones para instalarlo en tu PC (Linux/Mac/Windows).
3.  Edita `.github/workflows/devsecops.yml` y cambia:
    ```yaml
    runs-on: self-hosted  # En lugar de ubuntu-latest
    ```
    
**Resultado**: Cuando hagas `push`, el análisis correrá en TU máquina, actualizará los archivos de `dashboard/data` localmente y tu dashboard (localhost:7890) mostrará los cambios al instante.

---

## 🛠️ Ejecución Local (Opcional)

Si quieres probar antes de subir:

```bash
./scan.sh
```

Esto generará los reportes y el PDF en `dashboard/data/`.
