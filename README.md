# masterpiece-high-school-2025-2026

This project is my “Chef-d’œuvre,” completed during my vocational baccalaureate in CIEL (Cybersecurity, IT, Networks, and Electronics) at Lycée Raymond Queneau. It is a long-term project developed from the second year to the final year of high school.

---

## Docker Compose Setup

This project uses Docker Compose to simplify installation and execution.

### Requirements
- Docker installed
- Docker Compose (or Docker with built-in compose support)

---

## Linux

```bash
git clone https://github.com/your-repo-url.git
cd masterpiece-high-school-2025-2026
docker compose up --build
```

Stop:

```bash
docker compose down
```

---

## Windows

### PowerShell / CMD

```bash
git clone https://github.com/your-repo-url.git
cd masterpiece-high-school-2025-2026
docker compose up --build
```

Stop:

```bash
docker compose down
```

---

### Docker Desktop

1. Open Docker Desktop  
2. Open a terminal in the project folder  
3. Run:

```bash
docker compose up --build
```

---

## Access

Once running, open:

http://localhost:PORT

Replace PORT with the one defined in docker-compose.yml

---

## Notes

- First run may take time (image build)
- Make sure Docker is running before starting
