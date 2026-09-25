# PowerPress Production Monitoring System

A web-based production monitoring system designed to monitor power press machines and track their operational status, uptime, downtime, and production-related data.

## 📌 Project Overview

In manufacturing industries, machines may operate without proper real-time monitoring of their running and idle periods. This can make it difficult to identify downtime, measure machine utilization, and understand productivity losses.

The **PowerPress Production Monitoring System** is being developed to provide a centralized software platform for monitoring multiple power press machines.

The system is designed to support individual machine data and different input methods, with a focus on WiFi-based machine communication.

## 🎯 Objectives

* Monitor the status of power press machines.
* Track machine uptime and downtime.
* Maintain individual data for multiple machines.
* Store machine information in a database.
* Provide a web-based dashboard for monitoring.
* Support different machine input configurations.
* Create a scalable foundation for future industrial IoT integration.

## 🏭 System Architecture

```text
Power Press Machines
        │
        │ WiFi / Machine Signals
        ▼
   Backend Server
        │
        ▼
   PostgreSQL Database
        │
        ▼
   React Dashboard
        │
        ▼
   Machine Monitoring
```

## ⚙️ Technologies Used

### Frontend

* React
* JavaScript
* HTML
* CSS
* Vite

### Backend

* Node.js
* REST API

### Database

* PostgreSQL

### Development Tools

* Visual Studio Code
* Git
* GitHub

### Industrial / IoT

* WiFi-based machine communication
* Power press machine monitoring

## 🖥️ Current Machine Configuration

The current database configuration includes four power press machines:

| Machine        | Machine Code | Input Type   |
| -------------- | ------------ | ------------ |
| Power Press 01 | PRESS_01     | WiFi_Digital |
| Power Press 02 | PRESS_02     | WiFi_Counter |
| Power Press 03 | PRESS_03     | WiFi_Status  |
| Power Press 04 | PRESS_04     | WiFi_Digital |

The system is designed so that individual machines can have different input methods.

## 📊 Monitoring Data

The system is being developed to work with machine-related data such as:

* Machine status
* Uptime
* Downtime
* Machine cycles
* Availability
* Downtime events

## 📁 Project Structure

```text
powerpress-production-monitoring/
│
├── backend/
│   └── Backend server and API
│
├── frontend/
│   └── React dashboard
│
├── database/
│   └── Database schema and SQL files
│
├── .gitignore
└── README.md
```

## 🚧 Project Status

**Currently under development.**

The project is being developed and tested locally. Features and architecture may change as the system progresses toward deployment and real-machine integration.

## 🔮 Future Development

Planned improvements include:

* Real-time machine data integration
* Machine-wise monitoring
* User authentication and access control
* Production and downtime reports
* Data visualization and analytics
* Industrial device integration
* Cloud deployment
* Multi-company support with isolated company data

## 👩‍💻 Developer

**Utkarsha Nawale**

Electronics & Computer Engineering Student

GitHub: [@utkarshas05](https://github.com/utkarshas05)
## 🖥️ Featured Project

### PowerPress Production Monitoring System

A web-based production monitoring system designed to monitor power press machines, production, uptime, downtime, and machine activity.

**Technologies:** React • Node.js • PostgreSQL • REST API • WiFi/IoT • Git/GitHub

### 🔐 Login
![PowerPress Login](https://raw.githubusercontent.com/utkarshas05/powerpress-production-monitoring/main/screenshots/login.png)

### 📊 Production Dashboard
![PowerPress Dashboard](https://raw.githubusercontent.com/utkarshas05/powerpress-production-monitoring/main/screenshots/dashboard.png)

### ⚙️ Machine Details
![PowerPress Machine Details](https://raw.githubusercontent.com/utkarshas05/powerpress-production-monitoring/main/screenshots/machine-details.png)

---

⭐ This project is being developed as an ongoing engineering project focused on production monitoring and industrial IoT.
