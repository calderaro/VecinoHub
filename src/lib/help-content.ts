export type HelpAudience = "resident" | "admin" | "shared";

export type HelpScreenKey =
  | "dashboard-request-access"
  | "dashboard-invites"
  | "dashboard-members"
  | "dashboard-funds"
  | "dashboard-resources"
  | "admin-funds"
  | "admin-resources";

export type HelpArticleSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

export type HelpRelatedLink = {
  label: string;
  href: string;
};

export type HelpArticle = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  audience: HelpAudience;
  category: string;
  screenHints: HelpScreenKey[];
  body: HelpArticleSection[];
  relatedLinks: HelpRelatedLink[];
};

export type HelpContextEntry = {
  id: string;
  screenKey: HelpScreenKey;
  title: string;
  summary: string;
  whoUsesIt: string[];
  keyActions: string[];
  whatHappensNext: string[];
  articleSlug: string;
};

const helpArticles: HelpArticle[] = [
  {
    id: "resident-join-group",
    slug: "como-un-residente-se-une-a-un-grupo",
    title: "Cómo un residente se une a un grupo",
    summary:
      "Explica el camino recomendado para entrar a un grupo, ya sea por invitación directa o por solicitud de acceso.",
    audience: "resident",
    category: "Acceso",
    screenHints: ["dashboard-request-access", "dashboard-invites"],
    body: [
      {
        title: "Qué es",
        paragraphs: [
          "VecinoHub conecta a cada residente con el grupo correcto dentro de su colonia. Ese grupo es la puerta de entrada a publicaciones, eventos, pagos, reservaciones y otras actividades compartidas.",
          "En la práctica, un residente puede entrar a un grupo de dos maneras: recibiendo una invitación directa o enviando una solicitud de acceso para que un administrador la revise.",
        ],
      },
      {
        title: "Quién lo usa",
        items: [
          "Residentes nuevos que todavía no forman parte de un grupo.",
          "Residentes que recibieron una invitación y necesitan aceptarla.",
          "Usuarios con más de una colonia o más de un grupo que necesitan confirmar a cuál deben entrar.",
        ],
      },
      {
        title: "Cómo hacerlo",
        items: [
          "Si recibiste una invitación, entra a Invitaciones y revisa el grupo y la colonia antes de aceptar.",
          "Si no tienes invitación, abre Solicitar acceso, busca tu colonia por slug o usa un enlace compartido, elige tu grupo y envía la solicitud.",
          "Agrega una nota si el administrador necesita contexto para identificarte más rápido.",
        ],
      },
      {
        title: "Qué pasa después",
        items: [
          "Si aceptas una invitación, tu acceso al grupo se activa de inmediato.",
          "Si envías una solicitud, quedará pendiente hasta que un administrador la apruebe o rechace.",
          "Cuando tu solicitud se aprueba, también se habilita tu acceso residente a la colonia asociada.",
        ],
      },
      {
        title: "Errores o dudas frecuentes",
        items: [
          "Si no encuentras tu colonia, confirma que el slug sea exacto o pide al administrador el enlace correcto.",
          "Si ya enviaste una solicitud pendiente al mismo grupo, no necesitas crear otra.",
          "Si la invitación fue enviada a otro correo, inicia sesión con la cuenta correcta para poder usarla.",
        ],
      },
    ],
    relatedLinks: [
      { label: "Solicitar acceso", href: "/dashboard/request-access" },
      { label: "Revisar invitaciones", href: "/dashboard/invites" },
      { label: "Volver al panel", href: "/dashboard" },
    ],
  },
  {
    id: "invite-vs-request",
    slug: "diferencia-entre-invitacion-y-solicitud-de-acceso",
    title: "Diferencia entre invitación y solicitud de acceso",
    summary:
      "Aclara cuándo un usuario debe aceptar una invitación y cuándo debe crear una solicitud para que la revise un administrador.",
    audience: "shared",
    category: "Acceso",
    screenHints: ["dashboard-invites", "dashboard-request-access", "dashboard-members"],
    body: [
      {
        title: "Qué es",
        paragraphs: [
          "Las invitaciones y las solicitudes de acceso resuelven el mismo problema de formas distintas. Ambas terminan incorporando a una persona a un grupo, pero no comienzan del mismo lado.",
        ],
      },
      {
        title: "Diferencia principal",
        items: [
          "La invitación la inicia un administrador y llega a un correo específico.",
          "La solicitud de acceso la inicia el propio residente cuando todavía no ha sido invitado.",
          "La invitación se acepta o se rechaza; la solicitud se revisa y se aprueba o se rechaza.",
        ],
      },
      {
        title: "Cuándo conviene cada una",
        items: [
          "Usa invitación cuando el administrador ya sabe exactamente a quién quiere incorporar.",
          "Usa solicitud de acceso cuando el residente necesita pedir entrada por su cuenta.",
          "Usa el enlace compartido de colonia cuando quieres reducir errores al pedir acceso a la colonia correcta.",
        ],
      },
      {
        title: "Qué pasa después",
        items: [
          "Una invitación aceptada da acceso inmediato al grupo.",
          "Una solicitud aprobada da acceso cuando el administrador la valida.",
          "En ambos casos, el usuario termina viendo el grupo en su panel y puede empezar a operar dentro de él.",
        ],
      },
      {
        title: "Errores o dudas frecuentes",
        items: [
          "Si un usuario ya tiene una invitación, no necesita enviar una solicitud al mismo grupo.",
          "Si una solicitud sigue pendiente, conviene esperar revisión o cancelarla antes de enviar otra.",
        ],
      },
    ],
    relatedLinks: [
      { label: "Invitaciones", href: "/dashboard/invites" },
      { label: "Solicitar acceso", href: "/dashboard/request-access" },
      { label: "Panel principal", href: "/dashboard" },
    ],
  },
  {
    id: "shared-neighborhood-link",
    slug: "como-funciona-el-enlace-compartido-de-colonia",
    title: "Cómo funciona el enlace compartido de colonia",
    summary:
      "Describe cómo un administrador puede compartir un enlace que precarga la colonia correcta para acelerar el ingreso de residentes.",
    audience: "admin",
    category: "Acceso",
    screenHints: ["dashboard-request-access"],
    body: [
      {
        title: "Qué es",
        paragraphs: [
          "El enlace compartido de colonia es una ayuda rápida para que un residente llegue directo a la pantalla de solicitud con la colonia ya preseleccionada.",
          "Sirve para evitar errores al capturar manualmente el slug de la colonia y para hacer más simple el ingreso de nuevos vecinos.",
        ],
      },
      {
        title: "Quién lo usa",
        items: [
          "Administradores de colonia que orientan a nuevos residentes.",
          "Residentes que aún no pertenecen a un grupo y necesitan encontrar el acceso correcto.",
        ],
      },
      {
        title: "Cómo hacerlo",
        items: [
          "Abre Solicitar acceso.",
          "En la sección de compartir, copia el enlace de la colonia que administras.",
          "Envía ese enlace por el canal habitual: chat, correo o mensaje directo.",
        ],
      },
      {
        title: "Qué pasa después",
        items: [
          "El residente abre el enlace y la colonia queda bloqueada en la pantalla de solicitud.",
          "La persona solo debe elegir su grupo, agregar una nota si hace falta y enviar la solicitud.",
          "El equipo administrador recibe una solicitud mejor encaminada y con menos riesgo de error.",
        ],
      },
      {
        title: "Errores o dudas frecuentes",
        items: [
          "Si el usuario no inició sesión, primero tendrá que entrar o registrarse y luego volverá a la misma pantalla.",
          "El enlace no agrega a nadie automáticamente; únicamente prepara el contexto correcto para la solicitud.",
        ],
      },
    ],
    relatedLinks: [
      { label: "Compartir desde Solicitar acceso", href: "/dashboard/request-access" },
      { label: "Panel admin", href: "/admin" },
      { label: "Centro de ayuda", href: "/help" },
    ],
  },
  {
    id: "manage-members-roles",
    slug: "como-administrar-miembros-y-roles",
    title: "Cómo administrar miembros y roles",
    summary:
      "Resume cómo revisar miembros, invitar personas, cambiar roles y mantener ordenado el acceso de un grupo.",
    audience: "admin",
    category: "Miembros",
    screenHints: ["dashboard-members"],
    body: [
      {
        title: "Qué es",
        paragraphs: [
          "La pantalla de miembros concentra la operación diaria del grupo: quién pertenece, qué rol tiene, quién está invitado y qué solicitudes siguen pendientes.",
        ],
      },
      {
        title: "Quién lo usa",
        items: [
          "Administradores de grupo.",
          "Administradores de colonia que supervisan grupos dentro de su colonia.",
        ],
      },
      {
        title: "Cómo hacerlo",
        items: [
          "Revisa la pestaña de miembros para validar quién ya está activo.",
          "Usa la pestaña de invitaciones para enviar, reenviar o cancelar invitaciones.",
          "Actualiza roles cuando un miembro necesita más o menos permisos.",
          "Elimina o desactiva membresías cuando una persona ya no debe permanecer en el grupo.",
        ],
      },
      {
        title: "Qué pasa después",
        items: [
          "Los cambios de rol modifican las acciones disponibles para ese usuario dentro del grupo.",
          "Las invitaciones pendientes permanecen visibles hasta que se aceptan, se cancelan o expiran.",
          "Si una persona deja el grupo y era su último acceso activo, también puede perder el acceso residente a la colonia.",
        ],
      },
      {
        title: "Errores o dudas frecuentes",
        items: [
          "No conviene dejar al grupo sin ningún administrador activo.",
          "Antes de cambiar un rol, confirma si la persona seguirá aprobando solicitudes o gestionando miembros.",
        ],
      },
    ],
    relatedLinks: [
      { label: "Abrir panel del grupo", href: "/dashboard" },
      { label: "Solicitudes de acceso", href: "/dashboard/request-access" },
      { label: "Invitaciones", href: "/dashboard/invites" },
    ],
  },
  {
    id: "approve-access-requests",
    slug: "como-aprobar-o-rechazar-solicitudes-de-acceso",
    title: "Cómo aprobar o rechazar solicitudes de acceso",
    summary:
      "Explica cómo revisar solicitudes de residentes y qué impacto tiene aprobarlas o rechazarlas.",
    audience: "admin",
    category: "Miembros",
    screenHints: ["dashboard-members"],
    body: [
      {
        title: "Qué es",
        paragraphs: [
          "Las solicitudes de acceso son peticiones hechas por residentes que todavía no pertenecen a un grupo. El administrador valida si corresponden al grupo correcto antes de autorizar el ingreso.",
        ],
      },
      {
        title: "Qué revisar antes de decidir",
        items: [
          "Nombre y correo de la persona solicitante.",
          "Nota o contexto compartido por el residente.",
          "Si el grupo es el correcto según domicilio, torre, edificio o criterio operativo del vecindario.",
        ],
      },
      {
        title: "Cómo hacerlo",
        items: [
          "Abre la pestaña de solicitudes desde la pantalla de miembros.",
          "Revisa la información del solicitante y la fecha de expiración.",
          "Aprueba cuando la persona sí corresponde al grupo o rechaza si necesita volver a solicitar al grupo correcto.",
        ],
      },
      {
        title: "Qué pasa después",
        items: [
          "Una solicitud aprobada convierte al residente en miembro activo del grupo.",
          "Una solicitud rechazada no crea acceso y la persona tendrá que volver a intentarlo si sigue interesada.",
          "La decisión queda reflejada en el historial del flujo correspondiente.",
        ],
      },
      {
        title: "Errores o dudas frecuentes",
        items: [
          "Si el residente eligió el grupo equivocado, conviene rechazar y compartirle el camino correcto.",
          "Si hay dudas sobre identidad o pertenencia, es mejor validar antes de aprobar para evitar accesos incorrectos.",
        ],
      },
    ],
    relatedLinks: [
      { label: "Solicitar acceso", href: "/dashboard/request-access" },
      { label: "Panel del grupo", href: "/dashboard" },
      { label: "Centro de ayuda", href: "/help" },
    ],
  },
  {
    id: "funds-payments",
    slug: "como-funcionan-los-fondos-y-pagos",
    title: "Cómo funcionan los fondos y pagos",
    summary:
      "Presenta la lógica general de fondos: qué se cobra, qué ve un residente y qué gestiona un administrador.",
    audience: "shared",
    category: "Finanzas",
    screenHints: ["dashboard-funds", "admin-funds"],
    body: [
      {
        title: "Qué es",
        paragraphs: [
          "Los fondos ayudan a organizar cobros, periodos, movimientos y seguimiento financiero dentro de la colonia. Los residentes consultan lo que les toca y los administradores supervisan el estado general.",
        ],
      },
      {
        title: "Quién ve qué",
        items: [
          "El residente ve los fondos disponibles, sus saldos y los periodos que le aplican.",
          "El administrador ve el panorama completo: balance, periodos abiertos y pagos pendientes del vecindario.",
        ],
      },
      {
        title: "Cómo usarlo",
        items: [
          "El residente entra a Fondos desde su grupo para revisar obligaciones y pagos.",
          "El administrador entra al módulo de Fondos de la colonia para crear fondos, revisar periodos y monitorear pendientes.",
          "Cada pantalla está pensada para lectura rápida y seguimiento operativo, no solo para registro.",
        ],
      },
      {
        title: "Qué pasa después",
        items: [
          "Cuando se registran pagos o movimientos, cambia el estado operativo del fondo y su seguimiento.",
          "Los residentes ven información más clara sobre lo que deben y lo que ya se reflejó.",
          "Los administradores obtienen mayor control sobre ingresos, gastos y periodos abiertos.",
        ],
      },
      {
        title: "Errores o dudas frecuentes",
        items: [
          "Si un residente no encuentra un fondo, primero debe confirmar que está dentro del grupo correcto.",
          "Si un administrador necesita contexto de cobros o periodos, debe revisar la vista general antes de crear movimientos nuevos.",
        ],
      },
    ],
    relatedLinks: [
      { label: "Fondos del residente", href: "/dashboard" },
      { label: "Fondos de administración", href: "/admin" },
      { label: "Panel principal", href: "/dashboard" },
    ],
  },
  {
    id: "reserve-shared-resources",
    slug: "como-reservar-recursos-compartidos",
    title: "Cómo reservar recursos compartidos",
    summary:
      "Explica cómo consultar disponibilidad, crear reservaciones y entender las reglas básicas de uso de recursos.",
    audience: "shared",
    category: "Recursos",
    screenHints: ["dashboard-resources", "admin-resources"],
    body: [
      {
        title: "Qué es",
        paragraphs: [
          "Los recursos compartidos representan espacios o activos reservables del vecindario, como salones, terrazas o áreas comunes con reglas específicas de uso.",
        ],
      },
      {
        title: "Quién lo usa",
        items: [
          "Residentes que necesitan apartar un recurso disponible para su grupo.",
          "Administradores que configuran la disponibilidad, los bloqueos y el seguimiento de reservaciones.",
        ],
      },
      {
        title: "Cómo hacerlo",
        items: [
          "El residente entra al catálogo de recursos, revisa la ficha del recurso y valida horarios disponibles antes de reservar.",
          "El administrador usa el listado de recursos para revisar estado, carga operativa y accesos rápidos a reservaciones y bloqueos.",
          "Las reglas del recurso se revisan siempre antes de confirmar para evitar conflictos con capacidad, tiempo o disponibilidad.",
        ],
      },
      {
        title: "Qué pasa después",
        items: [
          "La reservación queda visible en el historial del grupo y en la supervisión administrativa.",
          "Los bloqueos afectan la disponibilidad futura y ayudan a proteger mantenimiento o uso interno.",
          "El vecindario gana trazabilidad sobre qué recurso se usa, cuándo y por quién.",
        ],
      },
      {
        title: "Errores o dudas frecuentes",
        items: [
          "Si un horario no aparece disponible, puede estar ocupado o bloqueado.",
          "Si un recurso no se muestra al residente, puede no estar habilitado para uso activo.",
        ],
      },
    ],
    relatedLinks: [
      { label: "Catálogo de recursos", href: "/dashboard" },
      { label: "Recursos de administración", href: "/admin" },
      { label: "Centro de ayuda", href: "/help" },
    ],
  },
  {
    id: "events-posts-polls",
    slug: "como-funcionan-eventos-publicaciones-y-encuestas",
    title: "Cómo funcionan eventos, publicaciones y encuestas",
    summary:
      "Da una visión general de los módulos de comunicación y participación del vecindario.",
    audience: "shared",
    category: "Comunidad",
    screenHints: [],
    body: [
      {
        title: "Qué es",
        paragraphs: [
          "Eventos, publicaciones y encuestas cubren tres necesidades distintas: informar, convocar y tomar decisiones. Juntos forman la capa de comunicación del vecindario dentro de VecinoHub.",
        ],
      },
      {
        title: "Cómo se diferencian",
        items: [
          "Publicaciones: sirven para comunicar información relevante o anuncios.",
          "Eventos: sirven para organizar actividades con fecha y hora.",
          "Encuestas: sirven para consultar y registrar decisiones o preferencias.",
        ],
      },
      {
        title: "Cómo usarlo",
        items: [
          "El residente consulta estos módulos desde su panel para mantenerse al día y participar.",
          "El administrador publica, convoca y estructura consultas según las necesidades del vecindario.",
        ],
      },
      {
        title: "Qué pasa después",
        items: [
          "Una buena combinación de publicaciones, eventos y encuestas reduce dudas operativas y mejora la participación.",
          "Cada módulo deja registro y contexto dentro del grupo o colonia correspondiente.",
        ],
      },
      {
        title: "Errores o dudas frecuentes",
        items: [
          "Antes de publicar, conviene confirmar si el mensaje debe ser anuncio, evento o consulta.",
          "Si una acción requiere confirmación de los vecinos, una publicación sola no sustituye una encuesta.",
        ],
      },
    ],
    relatedLinks: [
      { label: "Panel del residente", href: "/dashboard" },
      { label: "Panel admin", href: "/admin" },
      { label: "Perfil", href: "/profile" },
    ],
  },
];

const contextHelp: Record<HelpScreenKey, HelpContextEntry[]> = {
  "dashboard-request-access": [
    {
      id: "request-access-resident",
      screenKey: "dashboard-request-access",
      title: "Cómo usar Solicitar acceso",
      summary:
        "Esta pantalla ayuda a un residente a encontrar su colonia, elegir el grupo correcto y pedir ingreso sin depender de un contacto manual previo.",
      whoUsesIt: [
        "Residentes que todavía no pertenecen a un grupo.",
        "Usuarios que necesitan pedir acceso por su cuenta.",
      ],
      keyActions: [
        "Buscar la colonia por slug o abrirla desde un enlace compartido.",
        "Elegir el grupo correcto.",
        "Enviar una nota breve si el administrador necesita contexto.",
      ],
      whatHappensNext: [
        "La solicitud queda pendiente de revisión por parte de un administrador.",
        "Si se aprueba, el usuario obtiene acceso al grupo y a la colonia relacionada.",
      ],
      articleSlug: "como-un-residente-se-une-a-un-grupo",
    },
    {
      id: "request-access-share-link",
      screenKey: "dashboard-request-access",
      title: "Cómo compartir el enlace de colonia",
      summary:
        "Los administradores de colonia pueden copiar un enlace que precarga la colonia correcta y reduce errores al pedir acceso.",
      whoUsesIt: [
        "Administradores de colonia.",
        "Equipos que acompañan el onboarding de nuevos residentes.",
      ],
      keyActions: [
        "Copiar el enlace de la colonia desde esta misma pantalla.",
        "Compartirlo por correo, chat o mensaje directo.",
      ],
      whatHappensNext: [
        "El residente llega con la colonia ya seleccionada y solo debe elegir su grupo.",
        "Esto acelera la solicitud y reduce solicitudes mal dirigidas.",
      ],
      articleSlug: "como-funciona-el-enlace-compartido-de-colonia",
    },
  ],
  "dashboard-invites": [
    {
      id: "dashboard-invites-overview",
      screenKey: "dashboard-invites",
      title: "Cómo revisar invitaciones",
      summary:
        "Aquí el usuario confirma si tiene invitaciones pendientes, revisa a qué grupo corresponden y decide si aceptarlas o rechazarlas.",
      whoUsesIt: [
        "Residentes invitados a un grupo.",
        "Usuarios que recibieron acceso directo por correo.",
      ],
      keyActions: [
        "Revisar grupo, colonia y remitente de la invitación.",
        "Aceptar cuando la invitación corresponde al grupo correcto.",
        "Rechazar si no corresponde o si no se desea continuar.",
      ],
      whatHappensNext: [
        "Aceptar activa el acceso al grupo de inmediato.",
        "Rechazar deja la invitación cerrada y no crea membresía.",
      ],
      articleSlug: "diferencia-entre-invitacion-y-solicitud-de-acceso",
    },
  ],
  "dashboard-members": [
    {
      id: "dashboard-members-roles",
      screenKey: "dashboard-members",
      title: "Cómo administrar miembros y roles",
      summary:
        "Esta pantalla reúne el estado del grupo: miembros activos, invitaciones pendientes y solicitudes de acceso en revisión.",
      whoUsesIt: [
        "Administradores de grupo.",
        "Administradores de colonia con supervisión sobre el grupo.",
      ],
      keyActions: [
        "Revisar miembros activos.",
        "Invitar personas nuevas o reenviar invitaciones.",
        "Cambiar roles o remover acceso cuando haga falta.",
      ],
      whatHappensNext: [
        "Los cambios de rol afectan lo que cada persona puede gestionar.",
        "Las invitaciones y cambios de membresía se reflejan en el estado operativo del grupo.",
      ],
      articleSlug: "como-administrar-miembros-y-roles",
    },
    {
      id: "dashboard-members-requests",
      screenKey: "dashboard-members",
      title: "Cómo revisar solicitudes de acceso",
      summary:
        "Desde la pestaña de solicitudes se valida si una persona sí corresponde al grupo antes de darle entrada.",
      whoUsesIt: [
        "Administradores que aprueban o rechazan ingresos.",
      ],
      keyActions: [
        "Validar nombre, correo y nota del solicitante.",
        "Aprobar cuando el grupo es correcto.",
        "Rechazar cuando el usuario debe volver a solicitar a otro grupo.",
      ],
      whatHappensNext: [
        "Aprobar convierte la solicitud en acceso activo.",
        "Rechazar evita una membresía incorrecta y obliga a volver a solicitar si sigue interesado.",
      ],
      articleSlug: "como-aprobar-o-rechazar-solicitudes-de-acceso",
    },
  ],
  "dashboard-funds": [
    {
      id: "dashboard-funds-overview",
      screenKey: "dashboard-funds",
      title: "Cómo leer los fondos como residente",
      summary:
        "Esta vista resume los fondos disponibles para tu grupo, sus saldos y el estado operativo general de cada uno.",
      whoUsesIt: [
        "Residentes que consultan pagos, saldos y periodos.",
      ],
      keyActions: [
        "Revisar qué fondos están activos.",
        "Entrar a un fondo para consultar detalle y periodos relacionados.",
      ],
      whatHappensNext: [
        "El detalle del fondo ayuda a entender montos, historial y seguimiento de pagos del grupo.",
      ],
      articleSlug: "como-funcionan-los-fondos-y-pagos",
    },
  ],
  "dashboard-resources": [
    {
      id: "dashboard-resources-overview",
      screenKey: "dashboard-resources",
      title: "Cómo usar los recursos compartidos",
      summary:
        "Esta vista permite identificar recursos activos, revisar capacidad básica y entrar al detalle para reservar o consultar disponibilidad.",
      whoUsesIt: [
        "Residentes que quieren reservar un recurso del vecindario.",
      ],
      keyActions: [
        "Comparar recursos disponibles.",
        "Entrar al detalle para revisar reglas y horarios.",
        "Consultar historial de reservaciones del grupo.",
      ],
      whatHappensNext: [
        "Desde el detalle podrás iniciar una reservación o validar si el recurso sí se ajusta a tu necesidad.",
      ],
      articleSlug: "como-reservar-recursos-compartidos",
    },
  ],
  "admin-funds": [
    {
      id: "admin-funds-overview",
      screenKey: "admin-funds",
      title: "Cómo gestionar fondos de la colonia",
      summary:
        "Esta pantalla da a administración una vista consolidada para monitorear balance, periodos abiertos y pagos pendientes.",
      whoUsesIt: [
        "Administradores de colonia.",
        "Usuarios con responsabilidad financiera u operativa.",
      ],
      keyActions: [
        "Crear nuevos fondos.",
        "Entrar a un fondo para revisar movimientos, periodos y configuración.",
        "Monitorear pendientes para priorizar seguimiento.",
      ],
      whatHappensNext: [
        "Cada fondo se convierte en una unidad clara de control financiero para la colonia.",
      ],
      articleSlug: "como-funcionan-los-fondos-y-pagos",
    },
  ],
  "admin-resources": [
    {
      id: "admin-resources-overview",
      screenKey: "admin-resources",
      title: "Cómo administrar recursos y reservaciones",
      summary:
        "Esta pantalla centraliza el catálogo de recursos y da acceso rápido a bloqueos, reservaciones y edición de disponibilidad.",
      whoUsesIt: [
        "Administradores que operan espacios o recursos compartidos.",
      ],
      keyActions: [
        "Crear recursos nuevos.",
        "Revisar ocupación, bloqueos futuros y capacidad.",
        "Abrir reservaciones o bloqueos para dar seguimiento operativo.",
      ],
      whatHappensNext: [
        "La configuración correcta mejora la disponibilidad visible para residentes y reduce conflictos de agenda.",
      ],
      articleSlug: "como-reservar-recursos-compartidos",
    },
  ],
};

const screenLabels: Record<HelpScreenKey, string> = {
  "dashboard-request-access": "Solicitar acceso",
  "dashboard-invites": "Invitaciones",
  "dashboard-members": "Miembros del grupo",
  "dashboard-funds": "Fondos del grupo",
  "dashboard-resources": "Recursos del grupo",
  "admin-funds": "Fondos de la colonia",
  "admin-resources": "Recursos de la colonia",
};

export function listHelpArticles(locale: string) {
  void locale;
  return helpArticles;
}

export function getHelpArticleBySlug(locale: string, slug: string) {
  void locale;
  return helpArticles.find((article) => article.slug === slug) ?? null;
}

export function listContextHelpByScreen(locale: string, screenKey: HelpScreenKey) {
  void locale;
  return contextHelp[screenKey] ?? [];
}

export function getHelpScreenLabel(locale: string, screenKey: HelpScreenKey) {
  void locale;
  return screenLabels[screenKey];
}
