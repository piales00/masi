# Arquitectura

**Stellar Odyssey Perú 2026 · Track 6 · Open Build**

La idea que ordena todo lo demás: **casi todo Masi es una app normal**. Solo dos cosas viven en la cadena, y son exactamente las dos donde "confía en nosotros" es una respuesta débil.

---

## 1. La frontera de confianza

Lo que importa de este diagrama no son las cajas, sino la línea que las separa. A la izquierda, cosas que Masi puede cambiar. A la derecha, cosas que no.

```mermaid
flowchart LR
    subgraph OFF["Masi SÍ lo controla — fuera de la cadena"]
        direction TB
        UI["PWA React + Vite<br/>9 pantallas"]
        CAT["Catálogo de proveedores<br/>nombre, oficio, distrito, foto"]
        OFERTAS["Solicitudes y ofertas<br/>la negociación"]
        TXT["Texto de las reseñas"]
    end

    subgraph ON["Nadie lo controla — en la cadena"]
        direction TB
        ESC["Contrato escrow<br/>retiene el dinero"]
        HIST["Storage persistente<br/>quién calificó qué"]
        SAC["SAC de PEN-test<br/>los saldos"]
    end

    UI --> CAT
    UI --> OFERTAS
    UI -->|"create_job, fund, approve"| ESC
    UI -->|"rate + hash del texto"| HIST
    TXT -.->|"solo el hash"| HIST
    ESC --> SAC
    ESC --> HIST

    style ON fill:#FEF3C7,stroke:#F59E0B,stroke-width:3px
    style OFF fill:#EFF4FF,stroke:#2563EB,stroke-width:2px
```

**Por qué esas dos y no más:**

| En la cadena | Por qué una base de datos no alcanza |
|---|---|
| Retener el dinero | Si Masi lo guardara, estaría custodiando fondos de terceros: eso exige licencia de la SBS. El contrato lo retiene, así que Masi **no puede** cogerlo ni congelarlo |
| Quién calificó qué | `rate` solo lo puede llamar la dirección que pagó ese trabajo, una vez. Inventar una reseña obliga a contratar y pagar un trabajo real |

Todo lo demás —búsqueda, perfiles, ofertas, textos, fotos— está fuera porque una base de datos lo hace mejor, más rápido y más barato.

---

## 2. Cómo viaja una operación

El usuario nunca ve una wallet, nunca escribe una frase semilla y nunca necesita XLM. Esto es lo que ocurre cuando toca su huella:

```mermaid
sequenceDiagram
    participant U as María
    participant APP as PWA
    participant SW as Su contrato de cuenta<br/>(dirección C)
    participant RL as Relayer<br/>(OpenZeppelin)
    participant ES as Contrato escrow
    participant SAC as SAC PEN-test

    U->>APP: "Pagar protegido"
    APP->>APP: arma la llamada y la simula
    APP->>U: pide la huella
    U-->>SW: firma WebAuthn (secp256r1)
    SW->>SW: __check_auth valida la firma
    APP->>RL: envía la autorización
    RL->>RL: paga la comisión en XLM
    RL->>ES: fund(job_id)
    ES->>SAC: transfer(María → contrato)
    ES-->>APP: evento funded
    APP->>U: "Pago asegurado"
```

Las tres piezas que hacen posible la promesa:

- **Passkey + contrato de cuenta.** La llave se crea con WebAuthn en el celular y vive protegida por la huella. La cuenta es un contrato que valida esa firma en `__check_auth`. Sin frase semilla.
- **Relayer.** Mete la autorización en una transacción y paga el XLM. Solo acepta llamadas a nuestro contrato y al SAC.
- **SAC.** El saldo de una dirección C vive en el storage del SAC, no en una trustline. Por eso los usuarios no necesitan abrir ninguna.

---

## 3. Del trato al contrato

La negociación es off-chain. Solo cuando María acepta una oferta entra la cadena.

```mermaid
flowchart TD
    A["María publica<br/>su problema"] --> B["Proveedores<br/>envían ofertas"]
    B --> C{"María compara<br/>precio + estrellas"}
    C -->|"revisa el perfil"| P["rating_of · jobs_of<br/>historial verificable"]
    P --> C
    C -->|"acepta una"| D["create_job<br/>cliente, proveedor, monto"]

    D --> E["A partir de aquí,<br/>todo en la cadena"]

    style A fill:#EFF4FF
    style B fill:#EFF4FF
    style C fill:#EFF4FF
    style P fill:#FFF7E6
    style D fill:#FEF3C7,stroke:#F59E0B,stroke-width:2px
    style E fill:#FEF3C7,stroke:#F59E0B,stroke-width:2px
```

Al contrato le da igual cómo se emparejaron: `create_job` recibe un proveedor y un monto. Por eso la subasta no obligó a cambiar ni una línea del contrato.

---

## 4. Los nueve estados

```mermaid
stateDiagram-v2
    [*] --> Requested: create_job (cliente)
    Requested --> Accepted: accept (proveedor)
    Accepted --> Funded: fund (cliente)
    Funded --> Started: start (proveedor)<br/>libera materiales
    Started --> Submitted: submit (proveedor)
    Submitted --> Released: approve (cliente)<br/>o auto_release
    Started --> Disputed: dispute
    Submitted --> Disputed: dispute
    Disputed --> Resolved: resolve (árbitro)
    Requested --> Cancelled: cancel
    Accepted --> Cancelled: cancel
    Funded --> Cancelled: cancel (reembolso)
    Released --> [*]
    Resolved --> [*]
    Cancelled --> [*]
```

Tres reglas que el diagrama no muestra:

- **El adelanto de materiales no se puede disputar.** Una vez entregado en `start`, es del proveedor. Por eso está acotado al 50% como máximo: es el riesgo máximo del cliente.
- **`auto_release` cuenta desde `submit`**, no desde la creación. Si el proveedor nunca entrega, el cliente puede disputar.
- **Solo desde `Released` o `Resolved` se puede calificar**, una vez por trabajo.

---

## 5. Qué garantiza y qué no

**Garantiza:**

- Masi nunca custodia el dinero. Si Masi desaparece, el dinero sigue en el contrato y se libera igual.
- El proveedor cobra aunque el cliente no responda: `auto_release` lo puede disparar cualquiera, no hace falta que Masi ejecute nada.
- Una reseña solo la escribe quien pagó, una vez, y cualquiera lo comprueba en el explorador sin pedir permiso.

**No garantiza:**

- Que el trabajo esté bien hecho. Eso sigue siendo criterio humano: el árbitro es Masi y solo reparte el saldo.
- Que cliente y proveedor no se salten la plataforma. Es el riesgo normal de cualquier marketplace.
- La conversión a soles. Eso lo haría un anchor regulado vía SEP-24; Masi está del lado wallet y nunca toca soles.

---

## Estado de la implementación

| Pieza | Estado |
|---|---|
| Contrato `escrow` | Desplegado y verificado en testnet |
| `rate` e historial on-chain | Funcionando |
| `auto_release` | Verificado, disparado por un tercero |
| `dispute` / `resolve` | `NotImplemented` — primeros de la lista de recortes |
| Passkeys + contrato de cuenta | Funcionan en Android; pendiente el dominio definitivo |
| Relayer | Servicio verificado; falta integrarlo |
| Rampa a soles | Simulada, como dice el README |

IDs, hashes y cómo reproducirlo: [`DESPLIEGUE.md`](./DESPLIEGUE.md). Estado por frente: [`AVANCE.md`](./AVANCE.md).
