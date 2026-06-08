# Fingerprint & PingER Device Integration Guide

## Overview
This document explains how to integrate fingerprint scanners (PingER devices) with the Factory Management System for employee attendance registration.

## Architecture

Browser (WebAuthn/Biometric API)
    ?
Factory Frontend (localhost:3000)
    ?
Proxy/API Route (/api/*)
    ?
Backend API (Railway/localhost:5001)
    ?
MongoDB Database

## Supported Devices

### Web-Based Integration (Recommended)
The frontend uses Web Crypto API with Ed25519 algorithm. Works with:
- Chrome, Edge, Firefox browsers
- HTTPS required (or localhost for development)

### Hardware PingER Connection
Hardware devices connect via WebSocket and REST API.

## Backend Endpoints Required

| Endpoint | Method | Description |
|----------|--------|-------------|
| /auth/biometric/register/start | POST | Start biometric registration |
| /auth/biometric/register/finish | POST | Complete registration |
| /auth/biometric/login/start | POST | Start biometric login |
| /auth/biometric/login/finish | POST | Complete login + mark attendance |
| /realtime | WebSocket | Real-time attendance events |

## Performance Issues Found

### File: hooks/useEmployees.ts (Line 69)
CURRENT: limit=500 MAX - INSUFFICIENT FOR 3000+ EMPLOYEES
FIX: Change to limit=5000

### File: hooks/useAttendance.ts (Line 171)  
CURRENT: limit=200 MAX - INSUFFICIENT
FIX: Change to limit=5000

## Environment Variables

NEXT_PUBLIC_API_URL=https://werehouse-production-f4f4.up.railway.app/api/v1
