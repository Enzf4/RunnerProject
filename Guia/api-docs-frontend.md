# ⬛ STRAVA INTEGRATION API

**Documentação de Integração para a Equipe Frontend**

Versão 1.0 | Projeto Integrador | 2025

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Base URL & Ambientes](#2-base-url--ambientes)
3. [Autenticação](#3-autenticação)
4. [Fluxo OAuth Strava — Conectar Conta](#4-fluxo-oauth-strava--conectar-conta)
5. [Endpoint: Participar de Desafio (/join)](#5-participar-de-desafio--join)
6. [Endpoint: Atividades Recentes](#6-listar-atividades-recentes)
7. [Endpoint: Validação de Desafio (/sync)](#7-validar-desafio--sync)
8. [Endpoint: Desconectar Strava](#8-desconectar-strava)
9. [Tratamento de Erros](#9-tratamento-de-erros)
10. [Exemplos Completos por Plataforma](#10-fluxo-completo--exemplo-flutter)

---

## 1. Visão Geral

Este microsserviço é responsável por toda a integração entre o aplicativo e a plataforma Strava. Ele gerencia o fluxo OAuth de conexão de conta, busca atividades de corrida e valida automaticamente se um usuário completou os critérios de um desafio, liberando o prêmio no banco de dados.

| Campo | Detalhe |
|---|---|
| **Linguagem / Stack** | C# .NET 10 — ASP.NET Core Web API |
| **Banco de Dados** | Supabase (PostgreSQL) via supabase-csharp SDK |
| **Autenticação** | JWT Bearer Token emitido pelo Supabase Auth |
| **OAuth Provider** | Strava API v3 — Authorization Code Flow |
| **Formato de Resposta** | JSON (application/json) em todos os endpoints |

---

## 2. Base URL & Ambientes

| Ambiente | Base URL | Status | Observação |
|---|---|---|---|
| Produção | `https://api-projetointegrador-kmmg.onrender.com` | Ativo | Deploy automático via Render |
| Local (dev) | `https://localhost:7000` | Uso interno | appsettings.Development.json |

> Todos os endpoints têm o prefixo `/api`. Exemplo completo:
> `https://api-projetointegrador-kmmg.onrender.com/api/strava/login`

---

## 3. Autenticação

A maioria dos endpoints exige que o usuário esteja autenticado via Supabase Auth. O token JWT deve ser enviado no header de todas as requisições protegidas:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

```dart
// Como obter o token no SDK do Supabase:
final session = await supabase.auth.signInWithPassword(
  email: 'usuario@email.com',
  password: 'senha123',
);

final token = session.session!.accessToken; // usar este valor
```

| Endpoint | Requer JWT? | Observação |
|---|---|---|
| `GET /api/strava/login` | **Não** | userId passado como query param |
| `GET /api/strava/callback` | **Não** | Chamado automaticamente pelo Strava |
| `GET /api/strava/activities` | **Sim** | Bearer token no header Authorization |
| `DELETE /api/strava/disconnect` | **Sim** | Bearer token no header Authorization |
| `POST /api/challenges/{id}/join` | **Sim** | Bearer token no header Authorization |
| `POST /api/challenges/{id}/sync` | **Sim** | Bearer token no header Authorization |

---

## 4. Fluxo OAuth Strava — Conectar Conta

A conexão com o Strava usa o fluxo Authorization Code do OAuth 2.0. São 2 etapas: o frontend inicia o fluxo abrindo uma URL no browser, e o backend processa o retorno automaticamente.

### Etapa 1 — Iniciar a Conexão

**`GET /api/strava/login?userId={uuid}`** — Redireciona para página de autorização do Strava

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| userId | UUID (string) | Sim | ID do usuário autenticado no Supabase Auth |

> Este endpoint deve ser aberto no browser — não via fetch/axios — porque o Strava precisa exibir a tela de autorização para o usuário. No Flutter, use `url_launcher`. No React, use `window.location.href`.

#### Exemplo Flutter (url_launcher)

```dart
import 'package:url_launcher/url_launcher.dart';

Future<void> conectarStrava(String userId) async {
  final uri = Uri.parse(
    'https://api-projetointegrador-kmmg.onrender.com/api/strava/login?userId=$userId',
  );

  await launchUrl(uri, mode: LaunchMode.externalApplication);
}
```

#### Exemplo React / Web

```javascript
const conectarStrava = () => {
  const userId = supabase.auth.user()?.id;
  const url = `https://api-projetointegrador-kmmg.onrender.com/api/strava/login?userId=${userId}`;

  window.location.href = url; // abre no browser atual
  // ou window.open(url, '_blank') para nova aba
};
```

### Etapa 2 — Callback (automático)

**`GET /api/strava/callback`** — Processado automaticamente pelo backend

Após o usuário autorizar no Strava, este endpoint é chamado automaticamente. O backend salva os tokens e redireciona para a URL de sucesso ou erro do frontend.

| Situação | URL de Redirecionamento |
|---|---|
| Sucesso | `/strava/success?strava_athlete_id=123456&user_id=uuid` |
| Negado pelo usuário | `/strava/error?reason=access_denied` |
| Falha no token exchange | `/strava/error?reason=token_exchange_failed` |
| State inválido | `/strava/error?reason=invalid_state` |

> O frontend deve ter rotas `/strava/success` e `/strava/error` para processar os redirecionamentos. Em apps mobile com deep link, configure o scheme (ex: `myapp://strava/success`).

---

## 5. Participar de Desafio — /join

Este é o endpoint principal. Deve ser chamado quando o usuário clicar em 'Participar' em um desafio. Ele busca automaticamente todas as corridas do período do desafio no Strava e salva no banco.

**`POST /api/challenges/{challengeId}/join`** — Sincroniza atividades do período e salva no Supabase

### Parâmetros

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| challengeId | UUID (path) | Sim | ID do desafio na tabela challenges |
| Authorization | Header JWT | Sim | Bearer {token do Supabase Auth} |

### Exemplo de Requisição

```
POST /api/challenges/a1b2c3d4-e5f6-7890-abcd-ef1234567890/join
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### Resposta de Sucesso (200 OK)

```json
{
  "challengeId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "challengeTitle": "Corrida de Maio — 10km",
  "period": {
    "start": "2025-05-01T00:00:00Z",
    "end": "2025-05-31T23:59:59Z"
  },
  "activitiesSynced": 3,
  "message": "3 corrida(s) sincronizada(s) do Strava.",
  "activities": [
    {
      "stravaId": 14567890,
      "name": "Corrida matinal no parque",
      "distanceKm": 10.2,
      "movingTimeMinutes": 58.5,
      "startDate": "2025-05-10T07:30:00Z",
      "stravaUrl": "https://www.strava.com/activities/14567890"
    }
    // ... demais atividades
  ]
}
```

### Resposta sem atividades no período (200 OK)

```json
{
  "activitiesSynced": 0,
  "message": "Nenhuma corrida encontrada no período do desafio.",
  "activities": []
}
```

### Exemplo Flutter

```dart
Future<void> participarDesafio(String challengeId, String token) async {
  final response = await http.post(
    Uri.parse('https://api-projetointegrador-kmmg.onrender.com/api/challenges/$challengeId/join'),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    },
  );

  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    print('Atividades sincronizadas: ${data['activitiesSynced']}');
  } else if (response.statusCode == 404) {
    // Strava não conectado — redirecionar para /api/strava/login
    conectarStrava(userId);
  }
}
```

---

## 6. Listar Atividades Recentes

**`GET /api/strava/activities?count={n}`** — Retorna as últimas N corridas do usuário

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| count | int (query) | Não | Quantidade de atividades (padrão: 10, máx: 30) |
| Authorization | Header JWT | Sim | Bearer {token do Supabase Auth} |

### Resposta de Sucesso (200 OK)

```json
[
  {
    "id": 14567890,
    "name": "Corrida matinal",
    "sportType": "Run",
    "distanceKm": 8.5,
    "paceSecPerKm": 342,
    "elevationGainM": 45.0,
    "movingTimeSeconds": 2907,
    "startDate": "2025-05-10T07:30:00-03:00",
    "stravaUrl": "https://www.strava.com/activities/14567890"
  }
]
```

---

## 7. Validar Desafio — /sync

Verifica se alguma das atividades recentes do usuário cumpre os critérios do desafio e libera o prêmio automaticamente se sim.

**`POST /api/challenges/{challengeId}/sync`** — Valida e concede prêmio se critério atingido

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| challengeId | UUID (path) | Sim | ID do desafio |
| recentCount | int (query) | Não | Atividades a verificar (padrão: 10) |

### Tipos de Desafio Suportados

| challenge_type | target_value | Regra de Validação |
|---|---|---|
| `distance_km` | ex: 10.0 | Corrida deve ter distância >= 10 km |
| `pace_min_per_km` | ex: 360 | Pace (seg/km) deve ser <= 360 (6:00/km) |
| `elevation_m` | ex: 200 | Ganho de elevação >= 200 metros |
| `duration_min` | ex: 60 | Duração em movimento >= 60 minutos |

### Resposta — Desafio Concluído

```json
{
  "challengeCompleted": true,
  "rewardHistoryId": "f9e8d7c6-b5a4-3210-fedc-ba9876543210",
  "challengeTitle": "Corrida de 10km",
  "failureReason": null,
  "message": "Parabens! Desafio completado!"
}
```

### Resposta — Desafio Não Concluído

```json
{
  "challengeCompleted": false,
  "rewardHistoryId": null,
  "failureReason": "Nenhuma atividade recente cumpre os requisitos do desafio.",
  "message": "Desafio ainda nao concluido."
}
```

---

## 8. Desconectar Strava

**`DELETE /api/strava/disconnect`** — Remove a vinculação do Strava do usuário

Remove os tokens salvos. O usuário precisará refazer o fluxo de login para reconectar.

```dart
// Resposta de sucesso: 204 No Content (sem body)

// Flutter
final response = await http.delete(
  Uri.parse('https://api-projetointegrador-kmmg.onrender.com/api/strava/disconnect'),
  headers: {'Authorization': 'Bearer $token'},
);

// statusCode == 204 → desconectado com sucesso
```

---

## 9. Tratamento de Erros

Todos os erros seguem o mesmo formato JSON:

```json
{
  "error": "Mensagem descritiva do erro",
  "statusCode": 404,
  "traceId": "00-abc123-def456-00"
}
```

| HTTP Status | Situação | Ação Recomendada |
|---|---|---|
| **200** | Sucesso | Processar normalmente |
| **204** | Sucesso sem conteúdo | Operação concluída (ex: disconnect) |
| **400** | Parâmetro inválido | Verificar userId ou outros parâmetros |
| **401** | Não autenticado | Token JWT ausente, expirado ou inválido |
| **404 (token)** | Strava não conectado | Redirecionar para `/api/strava/login` |
| **404 (desafio)** | Desafio não encontrado | Verificar challengeId |
| **409** | Prêmio já concedido | Exibir mensagem 'você já ganhou este prêmio' |
| **502** | Erro na API do Strava | Aguardar e tentar novamente |
| **429** | Rate limit do Strava | Aguardar 15 min antes de tentar novamente |
| **500** | Erro interno | Reportar ao time de backend com o traceId |

---

## 10. Fluxo Completo — Exemplo Flutter

Abaixo o fluxo completo desde o login até a validação do desafio:

```dart
// 1. Usuário faz login no Supabase e obtém o token
final session = await supabase.auth.signInWithPassword(
  email: email, password: password,
);

final userId = session.session!.user.id;
final token  = session.session!.accessToken;

// 2. Usuário clica 'Conectar Strava' — abre browser externo
final stravaUrl = Uri.parse(
  'https://api-projetointegrador-kmmg.onrender.com/api/strava/login?userId=$userId'
);

await launchUrl(stravaUrl, mode: LaunchMode.externalApplication);

// O backend redireciona de volta para o app via deep link

// 3. Usuário clica 'Participar' em um desafio
final joinResp = await http.post(
  Uri.parse('https://api-projetointegrador-kmmg.onrender.com/api/challenges/$challengeId/join'),
  headers: {'Authorization': 'Bearer $token'},
);

final joinData = jsonDecode(joinResp.body);
print('Atividades sincronizadas: ${joinData['activitiesSynced']}');

// 4. Verificar se o desafio foi concluído
final syncResp = await http.post(
  Uri.parse('https://api-projetointegrador-kmmg.onrender.com/api/challenges/$challengeId/sync'),
  headers: {'Authorization': 'Bearer $token'},
);

final syncData = jsonDecode(syncResp.body);

if (syncData['challengeCompleted'] == true) {
  showDialog(context, 'Parabens! Voce completou o desafio!');
}
```

## 10b. Fluxo Completo — Exemplo React

```javascript
const BASE = 'https://api-projetointegrador-kmmg.onrender.com';

// Obter token do Supabase
const { data: { session } } = await supabase.auth.getSession();
const token  = session.access_token;
const userId = session.user.id;

// 1. Conectar Strava (abre na mesma aba)
window.location.href = `${BASE}/api/strava/login?userId=${userId}`;

// 2. Participar de desafio
const joinRes = await fetch(`${BASE}/api/challenges/${challengeId}/join`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
});

const join = await joinRes.json();
console.log(`Sincronizadas: ${join.activitiesSynced} corridas`);

// 3. Validar desafio
const syncRes = await fetch(`${BASE}/api/challenges/${challengeId}/sync`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
});

const sync = await syncRes.json();
if (sync.challengeCompleted) alert('Desafio concluido!');
```

---

> Dúvidas ou problemas? Entre em contato com o time de backend.
>
> Strava Integration API — v1.0 — Projeto Integrador 2025
