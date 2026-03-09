# ATUALIZAÇÃO — VALIDAÇÃO DE DESAFIOS

**Strava Integration API | Update 2025**

---

**O que mudou:** o endpoint `/sync` agora retorna um resultado **DETALHADO** com o que o usuário fez vs o que era exigido, incluindo barra de progresso. Também foi padronizado como o pace aparece nas respostas da API.

---

## 1. Tipos de Desafio — Como Funcionam

A tabela `challenges` no Supabase tem dois campos que definem a regra:

```
challenge_type  →  "corrida"  ou  "pace"
target_value    →  número que representa a meta
```

### Tipo `"corrida"` — desafio de distância mínima

`target_value` = quilômetros que o usuário precisa percorrer no mínimo

**Exemplos no banco:**

| challenge_type | target_value | Significado |
|---|---|---|
| `"corrida"` | `10.0` | correr ao menos 10 km |
| `"corrida"` | `5.0` | correr ao menos 5 km |
| `"corrida"` | `21.1` | correr uma meia-maratona |

**Regra de aprovação:**
```
distância_do_strava >= target_value  →  APROVADO
```

---

### Tipo `"pace"` — desafio de velocidade máxima

`target_value` = pace máximo permitido em minutos por km (formato decimal).
Pace menor = mais rápido. O usuário precisa correr **igual ou mais rápido**.

**Como funciona o decimal:**

| Valor | Equivalência |
|---|---|
| `6.0` | 6:00 /km |
| `6.5` | 6:30 /km (0.5 minuto = 30 segundos) |
| `5.75` | 5:45 /km (0.75 minuto = 45 segundos) |
| `7.0` | 7:00 /km |

**Exemplos no banco:**

| challenge_type | target_value | Significado |
|---|---|---|
| `"pace"` | `6.0` | precisa fazer menos de 6:00/km |
| `"pace"` | `5.5` | precisa fazer menos de 5:30/km |

**Regra de aprovação:**
```
pace_do_strava <= target_value  →  APROVADO
(pace menor = mais rápido = melhor)
```

---

## 2. Endpoint Atualizado — POST /api/challenges/{id}/sync

```
POST /api/challenges/{challengeId}/sync
Authorization: Bearer {token}
```

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| challengeId | UUID (path) | Sim | ID do desafio |
| recentCount | int (query) | Não | padrão 10, máx 30 |

**Exemplo:**
```
POST /api/challenges/abc-123/sync?recentCount=20
Authorization: Bearer eyJ...
```

---

### Resposta — Desafio CONCLUÍDO (200 OK)

```json
{
  "challengeCompleted": true,
  "rewardHistoryId": "f9e8d7c6-b5a4-3210-fedc-ba9876543210",
  "challengeTitle": "Corrida de 10km",
  "challengeType": "corrida",
  "message": "🏆 Parabéns! Desafio 'Corrida de 10km' concluído!",
  "failureReason": null,
  "progressPercent": 100,

  "requiredDistanceKm": 10.0,       
  "requiredPaceMinPerKm": null,      
  "requiredPaceFormatted": null,     

  "activityStravaId": 14567890,
  "activityName": "Corrida matinal no parque",
  "activityDistanceKm": 10.25,
  "activityPaceMinPerKm": 5.9,
  "activityPaceFormatted": "5:54",
  "activityMovingTimeMinutes": 60.4,
  "activityStravaUrl": "https://www.strava.com/activities/14567890",
  "totalRunsChecked": 5
}
```

> **Nota dos campos `required`:**
> - `requiredDistanceKm` → só aparece em desafios do tipo `"corrida"`
> - `requiredPaceMinPerKm` e `requiredPaceFormatted` → só aparecem em desafios do tipo `"pace"`

---

### Resposta — Desafio NÃO concluído, tipo `"corrida"` (200 OK)

```json
{
  "challengeCompleted": false,
  "rewardHistoryId": null,
  "challengeTitle": "Corrida de 10km",
  "challengeType": "corrida",
  "message": "Desafio ainda não concluído.",
  "failureReason": "Distância insuficiente: percorreu 7.50 km de 10.00 km exigidos (75% concluído).",
  "progressPercent": 75,

  "requiredDistanceKm": 10.0,
  "requiredPaceMinPerKm": null,
  "requiredPaceFormatted": null,

  "activityStravaId": 14567890,
  "activityName": "Corrida curta",
  "activityDistanceKm": 7.5,
  "activityPaceMinPerKm": 6.1,
  "activityPaceFormatted": "6:06",
  "activityMovingTimeMinutes": 45.8,
  "activityStravaUrl": "https://www.strava.com/activities/14567890",
  "totalRunsChecked": 5
}
```

---

### Resposta — Desafio NÃO concluído, tipo `"pace"` (200 OK)

```json
{
  "challengeCompleted": false,
  "challengeType": "pace",
  "message": "Desafio ainda não concluído.",
  "failureReason": "Pace muito lento: 6:45/km (limite máximo: 6:00/km). Precisa ser 0.75 min/km mais rápido.",
  "progressPercent": 89,

  "requiredDistanceKm": null,
  "requiredPaceMinPerKm": 6.0,
  "requiredPaceFormatted": "6:00",

  "activityDistanceKm": 8.2,
  "activityPaceMinPerKm": 6.75,
  "activityPaceFormatted": "6:45",
  "activityMovingTimeMinutes": 55.3,
  "activityStravaUrl": "https://www.strava.com/activities/14567891",
  "totalRunsChecked": 3
}
```

---

### Resposta — Prêmio já concedido anteriormente (200 OK)

```json
{
  "challengeCompleted": false,
  "challengeTitle": "Corrida de 10km",
  "message": "Você já completou este desafio!",
  "failureReason": "Prêmio já concedido anteriormente.",
  "progressPercent": 100
}
```

---

## 3. Campo Pace — Mudança no /api/strava/activities

O `GET /api/strava/activities` também foi atualizado. O campo antigo `paceSecPerKm` foi substituído por dois campos novos:

**Antes:**
```json
"paceSecPerKm": 366
```

**Depois:**
```json
"paceMinPerKm": 6.1,
"paceFormatted": "6:06",
"movingTimeMinutes": 45.8
```

> `paceMinPerKm` → decimal (use para cálculos)
> `paceFormatted` → string legível (use para exibir na tela)
> `movingTimeMinutes` → substitui o antigo `movingTimeSeconds`

**Resposta completa atualizada do `GET /api/strava/activities`:**

```json
[
  {
    "id": 14567890,
    "name": "Corrida matinal",
    "sportType": "Run",
    "distanceKm": 8.5,
    "paceMinPerKm": 6.1,
    "paceFormatted": "6:06",
    "elevationGainM": 45,
    "movingTimeMinutes": 51.8,
    "startDate": "2025-05-10T07:30:00-03:00",
    "stravaUrl": "https://www.strava.com/activities/14567890"
  }
]
```

---

## 4. Como Usar o `progressPercent`

O campo `progressPercent` vai de **0 a 100** e pode ser usado diretamente numa barra de progresso no app.

**Regra para `"corrida"`:**
```
progressPercent = (distância percorrida / distância exigida) * 100
Ex: percorreu 7.5 km de 10 km exigidos → progressPercent = 75
```

**Regra para `"pace"`:**
- `100` se o desafio foi concluído
- Valor entre 0–99 se não concluiu (quanto mais próximo do pace exigido, maior)

**Sugestão de uso no Flutter:**
```dart
LinearProgressIndicator(
  value: result['progressPercent'] / 100.0,
)
```

**Sugestão de uso no React:**
```html
<progress value={result.progressPercent} max={100} />
```

---

## 5. Guia Rápido — O que Exibir em Cada Situação

| Situação | Campos para usar na tela |
|---|---|
| Desafio tipo `"corrida"` | `requiredDistanceKm` + `activityDistanceKm` |
| Desafio tipo `"pace"` | `requiredPaceFormatted` + `activityPaceFormatted` |
| Barra de progresso | `progressPercent` (0–100) |
| Mensagem ao usuário | `message` ou `failureReason` |
| Link para a atividade | `activityStravaUrl` |
| Prêmio liberado? | `challengeCompleted == true && rewardHistoryId != null` |

---

## 6. Exemplo Flutter — Participar e Validar Desafio

```dart
Future<void> participarEValidar(String challengeId, String token) async {
  final base    = 'https://api-projetointegrador-kmmg.onrender.com';
  final headers = {'Authorization': 'Bearer $token'};

  // 1. Sincronizar atividades do período
  final joinRes = await http.post(
    Uri.parse('$base/api/challenges/$challengeId/join'),
    headers: headers,
  );

  // 2. Validar e tentar liberar o prêmio
  final syncRes = await http.post(
    Uri.parse('$base/api/challenges/$challengeId/sync'),
    headers: headers,
  );

  final data = jsonDecode(syncRes.body);

  if (data['challengeCompleted'] == true) {
    // Prêmio liberado!
    showSuccessDialog(data['message']);
  } else {
    // Mostrar progresso
    final progress = data['progressPercent'];   // 0–100
    final reason   = data['failureReason'];
    final type     = data['challengeType'];

    if (type == 'corrida') {
      final feito   = data['activityDistanceKm'];
      final exigido = data['requiredDistanceKm'];
      showProgress('$feito km de $exigido km ($progress%)');
    } else if (type == 'pace') {
      final fez    = data['activityPaceFormatted'];   // ex: "6:45"
      final limite = data['requiredPaceFormatted'];   // ex: "6:00"
      showProgress('Seu pace: $fez/km | Meta: $limite/km');
    }
  }
}
```

---

## 7. Exemplo React/JS — Participar e Validar Desafio

```javascript
const BASE = 'https://api-projetointegrador-kmmg.onrender.com';

async function participarEValidar(challengeId, token) {
  const headers = { Authorization: `Bearer ${token}` };

  // 1. Sincronizar atividades do período
  await fetch(`${BASE}/api/challenges/${challengeId}/join`, {
    method: 'POST', headers
  });

  // 2. Validar e tentar liberar o prêmio
  const res  = await fetch(`${BASE}/api/challenges/${challengeId}/sync`, {
    method: 'POST', headers
  });
  const data = await res.json();

  if (data.challengeCompleted) {
    alert(data.message); // Prêmio liberado!
    return;
  }

  // Mostrar progresso conforme o tipo
  console.log(`Progresso: ${data.progressPercent}%`);

  if (data.challengeType === 'corrida') {
    console.log(`${data.activityDistanceKm} km de ${data.requiredDistanceKm} km`);
  } else if (data.challengeType === 'pace') {
    console.log(`Seu pace: ${data.activityPaceFormatted}/km`);
    console.log(`Meta:     ${data.requiredPaceFormatted}/km`);
  }
}
```

---

> Dúvidas → time de backend
>
> Strava Integration API — Fim da Atualização
