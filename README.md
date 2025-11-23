# DevSecOps Infra Lab

Laboratorio personal para practicar CI/CD y seguridad (DevSecOps) con Docker, Nginx y más.

## Iniciar DefectDojo

Para levantar la instancia local de DefectDojo:

```bash
cd defectdojo
docker-compose up -d
```

Una vez iniciado, puedes obtener la contraseña del usuario `admin` con:

```bash
docker-compose logs -f uwsgi | grep "Admin password:"
```

Accede a la interfaz web en: [http://localhost:8080](http://localhost:8080)
