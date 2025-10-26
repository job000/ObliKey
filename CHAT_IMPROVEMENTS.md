# ObliKey - Chat System Forbedringer

## ✅ IMPLEMENTERT

### 1. **Support Chat-funksjonalitet**

**For CUSTOMERS**:
- 🎧 Grønn "Kontakt support" knapp i chat-grensesnittet
- Automatisk oppretter samtale med alle admins
- Enkel tilgang til support direkte fra chat-siden

**For ADMINS**:
- Mottar support-henvendelser fra kunder
- Kan svare og hjelpe kunder direkte
- Support-samtaler vises som vanlige chatter

**Hvordan det fungerer**:
```typescript
const startSupportChat = async () => {
  // Finn alle admins
  const adminsResponse = await api.getUsers({ role: 'ADMIN' });
  const admins = adminsResponse.data || [];

  // Opprett samtale med alle admins
  const response = await api.createConversation({
    participantIds: adminIds,
    name: 'Support',
    isGroup: adminIds.length > 1
  });
};
```

---

### 2. **Gruppechat-funksjonalitet**

**Features**:
- ✅ Velg flere brukere samtidig
- ✅ Gi gruppesamtalen et navn (valgfritt)
- ✅ Gruppe-ikon vises på samtaler med flere deltakere
- ✅ Viser antall deltakere i chat-header
- ✅ Støtte for både 1-til-1 og gruppechatter

**Brukerflyt**:
1. Klikk på "+ Ny samtale" knappen
2. Søk og velg flere brukere
3. Gi gruppesamtalen et navn (valgfritt)
4. Klikk "Start samtale (X)" hvor X er antall valgte brukere

**Gruppe-indikatorer**:
- Gruppe-ikon på samtale-avatar
- "X deltakere" vises i chat-header
- Gruppenavn vises hvis satt, ellers liste av navn

---

### 3. **Emoji-picker**

**Implementasjon**:
- 📦 Bruker `emoji-picker-react` library
- 😊 Smile-ikon ved siden av meldingsinput
- Klikk på emoji for å legge til i melding
- Støtter alle standard emojis

**Hvordan det fungerer**:
```typescript
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

const onEmojiClick = (emojiData: EmojiClickData) => {
  setNewMessage(prev => prev + emojiData.emoji);
};
```

**UI**:
- Emoji-picker åpner som popup over meldingsinput
- Automatisk lukkes når emoji velges
- Kan lukkes ved å klikke utenfor

---

### 4. **Fil-opplasting (Bilder, Videoer, Dokumenter)**

**Støttede filtyper**:
- 🖼️ **Bilder**: jpeg, jpg, png, gif, webp
- 🎥 **Videoer**: mp4, mov, avi, etc.
- 📄 **Dokumenter**: pdf, doc, docx

**Maks filstørrelse**: 50MB

**Hvordan det vises**:
- **Bilder**: Vises inline med thumbnail, kan klikkes for full størrelse
- **Videoer**: Video-player inline, kan avspilles direkte i chatten
- **Dokumenter**: Fil-ikon med nedlastningsknapp

**Brukerflyt**:
1. Klikk på 📎 Paperclip-ikon
2. Velg fil fra enheten
3. Filen lastes opp automatisk
4. Melding sendes med vedlegg

**Backend-integrasjon**:
```typescript
// Last opp fil
const uploadResponse = await api.uploadImage(file);

// Send melding med vedlegg
const response = await api.sendMessage(conversationId, {
  content: file.name,
  type: fileType, // 'image', 'video', eller 'file'
  attachmentUrl: uploadResponse.data.url
});
```

---

### 5. **Forbedret UI/UX**

**Forbedringer**:
- ✨ Bedre visning av gruppechatter med ikon
- 👥 Deltakerantall vises for gruppechatter
- 📱 Responsivt design
- 🔔 Uleste meldinger-indikator
- ⏰ Tidsstempler på alle meldinger
- 👤 Profilbilder/avatarer
- 🎨 Moderne fargepallett

**Samtale-liste**:
- Viser siste melding
- Tidsstempel for siste melding
- Uleste meldinger-badge
- Gruppe-ikon for gruppechatter

**Meldings-visning**:
- Egne meldinger til høyre (blå bakgrunn)
- Andres meldinger til venstre (hvit bakgrunn)
- Avsenders navn og avatar
- Tidsstempel under hver melding

---

## 🎯 Funksjonalitet per Brukerrolle

### CUSTOMER (Vanlig bruker)
- ✅ Kan kontakte support via grønn knapp
- ✅ Kan sende meldinger i samtaler
- ✅ Kan sende emojis
- ✅ Kan laste opp bilder/videoer
- ❌ Kan IKKE starte nye samtaler med andre brukere (kun support)

### TRAINER
- ✅ Kan starte nye samtaler med kunder
- ✅ Kan opprette gruppechatter
- ✅ Kan sende emojis og filer
- ✅ Full tilgang til chat-funksjoner

### ADMIN / SUPER_ADMIN
- ✅ Kan starte nye samtaler med alle
- ✅ Kan opprette gruppechatter
- ✅ Mottar support-henvendelser fra kunder
- ✅ Kan sende emojis og filer
- ✅ Full tilgang til chat-funksjoner

---

## 📋 Brukerflyt-eksempler

### 1. Kunde kontakter support
```
Kunde -> Åpner Chat-siden
      -> Ser "Kontakt support" knapp (grønn med headphones-ikon)
      -> Klikker på knappen
      -> Samtale opprettes automatisk med alle admins
      -> Kan sende melding direkte
      -> Admin mottar henvendelse
      -> Admin svarer
      -> Kunde ser svar i sanntid
```

### 2. Admin oppretter gruppechat for yoga-klasse
```
Admin -> Klikker "+ Ny samtale"
      -> Søker etter deltakere i yoga-klassen
      -> Velger 5 deltakere
      -> Skriver gruppenavn: "Yoga Tirsdag 18:00"
      -> Klikker "Start samtale (5)"
      -> Gruppechat opprettes
      -> Admin sender velkomstmelding med emoji 🧘‍♀️
      -> Alle deltakere mottar melding
```

### 3. Trainer sender video til kunde
```
Trainer -> Åpner samtale med kunde
        -> Klikker på 📎 (Paperclip)
        -> Velger treningsvideo fra PC
        -> Video lastes opp (viser loading-spinner)
        -> Melding sendes med video
        -> Kunde ser video og kan spille av direkte
```

---

## 🔧 Tekniske Detaljer

### Frontend Komponenter

**ChatPage.tsx** (Hovedkomponent):
- State management for samtaler, meldinger, brukere
- WebSocket-lignende polling (kan oppgraderes til real-time)
- Emoji picker integration
- Fil-opplasting med progress
- Responsivt design

**Nye Dependencies**:
```json
{
  "emoji-picker-react": "^latest"
}
```

### Backend API

**Eksisterende Endpoints**:
```
GET    /api/chat/conversations          # Hent alle samtaler
POST   /api/chat/conversations          # Opprett ny samtale
GET    /api/chat/conversations/:id/messages  # Hent meldinger
POST   /api/chat/conversations/:id/messages  # Send melding
DELETE /api/chat/messages/:id           # Slett melding
```

**Message Types**:
- `text` - Vanlig tekstmelding
- `image` - Bilde-melding
- `video` - Video-melding
- `file` - Dokument/fil-melding

### Database (Fra chat.controller.ts)

**Tables** (via raw SQL):
- `conversations` - Samtaler
- `conversation_participants` - Deltakere i samtaler
- `messages` - Meldinger

**Fields**:
```sql
messages:
  - id
  - conversationId
  - senderId
  - content
  - type (text/image/video/file)
  - attachmentUrl
  - deletedAt
  - createdAt
  - updatedAt

conversations:
  - id
  - tenantId
  - name
  - isGroup
  - createdAt
  - updatedAt

conversation_participants:
  - id
  - conversationId
  - userId
  - joinedAt
  - lastReadAt
```

---

## 🎨 UI/UX Screenshots (Konseptuell beskrivelse)

### Support Chat Knapp
```
┌─────────────────────────────────┐
│ Meldinger             [🎧] [+]  │  ← Grønn support knapp for CUSTOMER
│                                  │    Blå + knapp for ADMIN/TRAINER
│ [🔍 Søk samtaler...]            │
└─────────────────────────────────┘
```

### Gruppechat med Ikon
```
┌─────────────────────────────────┐
│ ┌─────┐ Yoga Tirsdag 18:00      │
│ │ 👥  │ 5 deltakere              │  ← Gruppe-ikon
│ └─────┘                          │
│   Anna: Ses i morgen! 🧘‍♀️       │
└─────────────────────────────────┘
```

### Melding med Bilde
```
┌─────────────────────────────────┐
│ [👤] Anna Larsen                 │
│     ┌────────────────────┐      │
│     │  [Bilde av yoga]   │      │  ← Inline bilde
│     └────────────────────┘      │
│     "Her er stillingen!"         │
│     14:30                        │
└─────────────────────────────────┘
```

### Emoji Picker
```
┌─────────────────────────────────┐
│ [📎] [Skriv melding...] [😊] [➤]│
│              ▲                   │
│      ┌───────────────┐          │
│      │ 😀 😃 😄 😁   │          │  ← Emoji picker
│      │ 😆 😅 😂 🤣   │          │
│      │ 🧘‍♀️ 🏋️ 🤸 💪  │          │
│      └───────────────┘          │
└─────────────────────────────────┘
```

---

## 📊 Statistikk og Metrikker

### Mulige fremtidige forbedringer:
- 📈 Antall support-henvendelser per dag
- ⏱️ Gjennomsnittlig responstid for support
- 👥 Mest aktive gruppechatter
- 📸 Mest brukte meldingstyper (tekst vs. bilder vs. video)

---

## 🔐 Sikkerhet og Personvern

**Implementert**:
- ✅ Kun deltakere kan se meldinger i samtale
- ✅ Fil-størrelse begrenset til 50MB
- ✅ Bare avsender kan slette egne meldinger
- ✅ Tenant-isolasjon (kun brukere i samme tenant)

**Anbefalte tillegg**:
- [ ] End-to-end kryptering for sensitive meldinger
- [ ] Automatisk sletting av gamle vedlegg
- [ ] Moderering av vedlegg (bildegjennomsyn)
- [ ] GDPR-compliant eksport av chat-historikk

---

## 🚀 Installasjon og Bruk

### 1. Installer Dependencies
```bash
cd frontend
npm install emoji-picker-react
```

### 2. Start Applikasjonen
```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev
```

### 3. Test Funksjonaliteten

**Som Kunde**:
1. Logg inn som CUSTOMER
2. Gå til Chat-siden
3. Klikk "Kontakt support" (grønn knapp)
4. Send en melding til support

**Som Admin**:
1. Logg inn som ADMIN
2. Se support-henvendelsen
3. Svar på henvendelsen
4. Test å lage gruppechat med flere brukere

**Test Emojis og Filer**:
1. Åpne en samtale
2. Klikk på Smile-ikon for å åpne emoji-picker
3. Velg en emoji og send
4. Klikk på Paperclip-ikon for å laste opp fil
5. Velg et bilde eller video og se at det vises inline

---

## 🐛 Kjente Begrensninger

1. **Real-time oppdateringer**: Bruker polling i stedet for WebSockets
   - **Løsning**: Implementer Socket.io for sanntids-meldinger

2. **Fil-lagring**: Filer lagres lokalt på serveren
   - **Løsning**: Integrer med AWS S3 eller lignende cloud storage

3. **Emoji-picker språk**: Kun engelsk
   - **Løsning**: Konfigurer emoji-picker-react for norsk

4. **Ingen typing-indikator**: Viser ikke når noen skriver
   - **Løsning**: Legg til typing indicator med WebSockets

---

## 💡 Fremtidige Forbedringer

### Prioritet 1 (Høy)
- [ ] **WebSocket/Socket.io** - Real-time meldinger uten refresh
- [ ] **Typing indicator** - Vis når noen skriver
- [ ] **Read receipts** - Vis når meldinger er lest
- [ ] **Push notifications** - Varsle om nye meldinger

### Prioritet 2 (Medium)
- [ ] **Voice messages** - Send lydopptak
- [ ] **Message reactions** - Like/emoji reactions på meldinger
- [ ] **Message search** - Søk i chat-historikk
- [ ] **Pin messages** - Fest viktige meldinger

### Priorit 3 (Lav)
- [ ] **Message forwarding** - Videresend meldinger
- [ ] **Chat export** - Eksporter chat-historikk til PDF
- [ ] **Scheduled messages** - Send meldinger på et senere tidspunkt
- [ ] **Chat bots** - Automatiske svar for vanlige spørsmål

---

## 📚 Kode-eksempler

### Sende melding med emoji
```typescript
const [newMessage, setNewMessage] = useState('');

const onEmojiClick = (emojiData: EmojiClickData) => {
  setNewMessage(prev => prev + emojiData.emoji);
};

const sendMessage = async (e: React.FormEvent) => {
  e.preventDefault();
  const response = await api.sendMessage(conversationId, {
    content: newMessage // Inneholder emojis
  });
};
```

### Laste opp og vise bilde
```typescript
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];

  // Last opp fil
  const uploadResponse = await api.uploadImage(file);

  // Send melding med bilde
  await api.sendMessage(conversationId, {
    content: file.name,
    type: 'image',
    attachmentUrl: uploadResponse.data.url
  });
};

// Visning av bilde i melding
const renderMessageContent = (message: Message) => {
  if (message.type === 'image' && message.attachmentUrl) {
    return (
      <img
        src={message.attachmentUrl}
        alt={message.content}
        className="max-w-sm rounded-lg cursor-pointer"
        onClick={() => window.open(message.attachmentUrl, '_blank')}
      />
    );
  }
  return <p>{message.content}</p>;
};
```

### Opprette gruppechat
```typescript
const startNewConversation = async () => {
  const isGroup = selectedUsers.length > 1;

  const response = await api.createConversation({
    participantIds: selectedUsers,
    name: isGroup && groupChatName ? groupChatName : undefined,
    isGroup
  });
};
```

---

## ✅ Oppsummering

**Nye Funksjoner**:
- ✅ Support chat (grønn knapp for kunder)
- ✅ Gruppechat med navn og ikon
- ✅ Emoji-picker
- ✅ Fil-opplasting (bilder, videoer, dokumenter)
- ✅ Forbedret UI med moderne design
- ✅ Rolle-basert tilgang

**Forbedringer**:
- ✅ Bedre visning av gruppechatter
- ✅ Inline visning av bilder og videoer
- ✅ Deltakerantall i gruppechatter
- ✅ Uleste meldinger-indikator
- ✅ Responsivt design

**Testing**:
- ✅ Test support chat som kunde
- ✅ Test gruppechat som admin
- ✅ Test emoji-picker
- ✅ Test fil-opplasting

Alt er klart for bruk! 🎉
