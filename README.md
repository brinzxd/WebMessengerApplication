# WebMessengerApplication

A real-time web messenger built with Spring Boot 3, React, WebSocket/STOMP, JWT Auth, MySQL, MinIO, and Docker.

## Stack
- **Backend**: Spring Boot 3, Spring MVC, Spring Security + JWT, Spring WebSocket + STOMP
- **Database**: MySQL 8 + Spring Data JPA + Flyway
- **File Storage**: MinIO
- **Frontend**: React 18 + Vite + Axios + @stomp/stompjs
- **Infra**: Docker + Docker Compose

## Quick Start
```bash
docker-compose up --build
```
- Backend: http://localhost:8080
- Frontend: http://localhost:3000
- MinIO Console: http://localhost:9001

## Milestones
- [x] M1 - Project Scaffold
- [x] M2 - Auth (Register/Login/JWT)
- [ ] M3 - Users & Friends
- [ ] M4 - Conversations & Messages
- [ ] M5 - Real-time WebSocket
- [ ] M6 - Frontend Pages
- [ ] M7 - Polish & Settings
