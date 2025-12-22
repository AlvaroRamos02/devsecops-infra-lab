#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# SecureShift - Git Hooks Setup
# Configura el pre-push hook para ejecutar scan.sh automáticamente
# ═══════════════════════════════════════════════════════════════

HOOK_FILE=".git/hooks/pre-push"

cat > "$HOOK_FILE" << 'EOF'
#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# SecureShift - Pre-Push Hook
# Ejecuta scan.sh antes de cada push para generar reports locales
# ═══════════════════════════════════════════════════════════════

echo "🛡️  SecureShift: Ejecutando análisis de seguridad..."

# Ejecutar scan.sh
if [ -f "./scan.sh" ]; then
    ./scan.sh
    SCAN_EXIT=$?
    
    if [ $SCAN_EXIT -eq 0 ]; then
        echo "✅ Análisis completado. Reports guardados en dashboard/data/"
        echo "📊 Push continúa..."
    else
        echo "⚠️  Scan.sh falló, pero el push continúa (reports parciales pueden estar disponibles)"
    fi
else
    echo "⚠️  scan.sh no encontrado, saltando análisis"
fi

# Siempre permitir el push (exit 0)
exit 0
EOF

chmod +x "$HOOK_FILE"
chmod +x scan.sh

echo "✅ Git hook instalado correctamente"
echo ""
echo "Ahora, cada vez que hagas 'git push':"
echo "  1. Se ejecutará scan.sh automáticamente"
echo "  2. Los reports se guardarán en dashboard/data/"
echo "  3. El push continuará normalmente"
echo ""
echo "🎯 Ya no necesitas git pull ni descargar artifacts!"
