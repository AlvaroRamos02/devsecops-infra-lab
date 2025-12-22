# SecureShift 🛡️

**Seguridad automatizada para tu código. Cero configuración.**

---

## 🚀 Cómo usar (3 pasos)

### 1. Copia SecureShift a tu repo
```bash
# Copia estas carpetas a tu repositorio:
├── .github/workflows/devsecops.yml
├── dashboard/
└── Dockerfile
```

### 2. Pon tu código en `app/`
```bash
# Tu aplicación (Python, Node, Java, etc.)
app/
└── tu-proyecto/
```

### 3. Haz push
```bash
git add .
git commit -m "Add SecureShift"
git push
```

**¡Listo!** Los análisis corren automáticamente.

---

## 📊 Ver Resultados

### Opción A: GitHub Pages (recomendado)
1. Ve a **Settings → Pages**
2. Source: **Deploy from branch** → `gh-pages`
3. Abre: `https://TU-USUARIO.github.io/TU-REPO/`

### Opción B: Descargar Artifacts
1. Ve a **Actions** → click en el workflow
2. Descarga **security-dashboard-complete**

---

## 🔍 ¿Qué analiza?

| Análisis | Herramienta | Detecta |
|----------|-------------|---------|
| **SAST** | Semgrep | Vulnerabilidades en código (SQL injection, XSS, etc.) |
| **SCA Repo** | Trivy | Dependencias vulnerables (npm, pip, etc.) |
| **SCA Image** | Trivy | Vulnerabilidades en imagen Docker |

---

## 📁 Estructura

```
tu-repo/
├── app/                    # 👈 Tu código aquí
├── dashboard/              # Panel web de resultados
├── .github/workflows/      # Automatización
└── Dockerfile              # Para análisis de imagen
```

---

## ❓ FAQ

**¿Necesito Docker instalado?**
No. Todo corre en GitHub Actions.

**¿Funciona con Python/Node/Java/etc?**
Sí. Semgrep y Trivy soportan múltiples lenguajes.

**¿Cuánto tarda?**
~2-5 minutos dependiendo del tamaño del proyecto.

**¿Puedo personalizar los costes/notas?**
Sí. En el dashboard → Risk & Value → edita los multiplicadores.

---

## 📄 Licencia

MIT - Úsalo libremente.
