# DevSecOps Integration Guide 🚀

This guide explains how to integrate the DevSecOps Security Scanner into your CI/CD pipelines.

## ⚡ Quick Start (Local)

To run a full security scan locally, simply execute the helper script:

```bash
chmod +x scan.sh
./scan.sh
```

This will:
1.  Run Semgrep (SAST)
2.  Run Trivy FS (SCA - Repository)
3.  Build a Docker image
4.  Run Trivy Image (SCA - Image)
5.  Generate reports in `dashboard/data/`

---

## 🤖 CI/CD Integration

The `scan.sh` script is designed to be CI/CD friendly. It encapsulates all Docker commands, making your pipeline configuration clean and simple.

### 1. GitHub Actions

Create a file `.github/workflows/security-scan.yml`:

```yaml
name: Security Scan
on: [push, pull_request]

jobs:
  devsecops:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v3

      - name: Run Security Scan
        run: |
          chmod +x scan.sh
          ./scan.sh

      - name: Upload Reports
        uses: actions/upload-artifact@v3
        with:
          name: security-reports
          path: dashboard/data/
```

### 2. GitLab CI

Add this stage to your `.gitlab-ci.yml`:

```yaml
stages:
  - security

security_scan:
  stage: security
  image: docker:latest
  services:
    - docker:dind
  script:
    - chmod +x scan.sh
    - ./scan.sh
  artifacts:
    paths:
      - dashboard/data/
```

### 3. Jenkins

In your `Jenkinsfile`:

```groovy
pipeline {
    agent any
    stages {
        stage('Security Scan') {
            steps {
                sh 'chmod +x scan.sh'
                sh './scan.sh'
            }
        }
    }
    post {
        always {
            archiveArtifacts artifacts: 'dashboard/data/*.json', fingerprint: true
        }
    }
}
```

## 📊 Viewing the Dashboard

After the pipeline runs and reports are generated/downloaded:

1.  Ensure reports are in `dashboard/data/`
2.  Start the dashboard:
    ```bash
    docker-compose up -d dashboard
    ```
3.  Access at `http://localhost:7890`
