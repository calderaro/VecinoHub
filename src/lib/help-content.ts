export type HelpAudience = "resident" | "admin" | "shared";

export type HelpRole = "resident" | "group_admin" | "neighborhood_admin" | "shared";

export type HelpJourney =
  | "access"
  | "members"
  | "funds"
  | "resources"
  | "community"
  | "account";

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

export type HelpActionLink = {
  label: string;
  href: string;
  intent: string;
};

export type HelpArticle = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  audience: HelpAudience;
  category: string;
  roles: HelpRole[];
  journey: HelpJourney;
  priority: number;
  keywords: string[];
  supportSignals: string[];
  screenHints: HelpScreenKey[];
  body: HelpArticleSection[];
  ctaLinks: HelpActionLink[];
  published: boolean;
};

export type HelpContextEntry = {
  id: string;
  screenKey: HelpScreenKey;
  title: string;
  summary: string;
  purpose: string;
  whoUsesIt: string[];
  beforeYouStart: string[];
  keyActions: string[];
  whatHappensNext: string[];
  articleSlug: string;
  roles: HelpRole[];
  priority: number;
  triggerIntent: string;
  productLinks: HelpActionLink[];
};

export type HelpQuickAnswer = {
  id: string;
  screenKey: HelpScreenKey;
  question: string;
  answer: string;
  articleSlug: string;
  roles: HelpRole[];
  priority: number;
};

export type HelpRoleResolverInput = {
  accountRole: "user" | "admin" | "platform_admin";
  hasNeighborhoodAdminAccess?: boolean;
  viewerCanManage?: boolean;
  viewerMembershipRole?: "group_member" | "group_admin" | null;
};

type HelpSelectorBase = {
  locale: string;
  role: HelpRole;
};

type FeaturedSelectorInput = HelpSelectorBase & {
  limit?: number;
  screenKey?: HelpScreenKey;
};

type SearchSelectorInput = HelpSelectorBase & {
  query: string;
};

type RelatedSelectorInput = HelpSelectorBase & {
  slug: string;
  limit?: number;
};

const helpArticles: HelpArticle[] = [
  {
    id: "resident-join-group",
    slug: "como-un-residente-se-une-a-un-grupo",
    title: "Cómo un residente se une a un grupo",
    summary:
      "Explica el recorrido recomendado para integrarte al grupo correcto, ya sea por invitación directa o por solicitud de acceso.",
    audience: "resident",
    category: "Acceso",
    roles: ["resident"],
    journey: "access",
    priority: 100,
    keywords: [
      "unirme",
      "unirse",
      "grupo",
      "colonia",
      "vecino",
      "alta",
      "acceso",
      "registro",
    ],
    supportSignals: [
      "quiero entrar a mi grupo",
      "no pertenezco a ningun grupo",
      "como me doy de alta",
      "como entro a la colonia",
    ],
    screenHints: ["dashboard-request-access", "dashboard-invites"],
    body: [
      {
        title: "Qué es",
        paragraphs: [
          "VecinoHub usa los grupos como punto de entrada a la vida diaria de la colonia. Ahí se concentran publicaciones, eventos, fondos, reservaciones y otras acciones compartidas.",
          "Para integrarte al grupo correcto puedes aceptar una invitación existente o enviar una solicitud de acceso para que un administrador la revise.",
        ],
      },
      {
        title: "Quién lo usa",
        items: [
          "Residentes nuevos que todavía no forman parte de un grupo.",
          "Usuarios que recibieron una invitación y necesitan confirmarla.",
          "Personas que dudan entre varios grupos y necesitan validar cuál corresponde.",
        ],
      },
      {
        title: "Antes de empezar",
        items: [
          "Ten claro el nombre de tu colonia o el enlace compartido que te envió la administración.",
          "Confirma a qué grupo perteneces según domicilio, torre, edificio o criterio operativo.",
          "Si necesitas validación manual, prepara una nota breve para que te identifiquen más rápido.",
        ],
      },
      {
        title: "Cómo hacerlo",
        items: [
          "Si ya tienes invitación, abre Invitaciones y confirma que grupo y colonia sean correctos antes de aceptar.",
          "Si no tienes invitación, entra a Solicitar acceso, busca la colonia o usa el enlace compartido y elige tu grupo.",
          "Envía una nota si el administrador necesita contexto adicional para ubicarte.",
        ],
      },
      {
        title: "Qué pasa después",
        items: [
          "Aceptar una invitación activa tu acceso de inmediato.",
          "Enviar una solicitud deja el ingreso pendiente hasta revisión administrativa.",
          "Cuando la solicitud se aprueba, también se habilita tu acceso residente a la colonia asociada.",
        ],
      },
      {
        title: "Errores o dudas frecuentes",
        items: [
          "Si no encuentras tu colonia, confirma que el slug o el enlace sean correctos.",
          "Si ya tienes una solicitud pendiente, primero revisa su estado antes de volver a intentar.",
          "Si entraste al grupo equivocado, pide orientación antes de usar módulos de pagos o reservaciones.",
        ],
      },
    ],
    ctaLinks: [
      { label: "Abrir Solicitar acceso", href: "/dashboard/request-access", intent: "open_request_access" },
      { label: "Revisar invitaciones", href: "/dashboard/invites", intent: "open_invites" },
      { label: "Volver al centro de ayuda", href: "/help", intent: "open_help_center" },
    ],
    published: true,
  },
  {
    id: "invite-vs-request",
    slug: "diferencia-entre-invitacion-y-solicitud-de-acceso",
    title: "Diferencia entre invitación y solicitud de acceso",
    summary:
      "Aclara cuándo conviene aceptar una invitación existente y cuándo debes iniciar una solicitud para que te revisen manualmente.",
    audience: "shared",
    category: "Acceso",
    roles: ["resident", "group_admin", "neighborhood_admin"],
    journey: "access",
    priority: 95,
    keywords: ["invitacion", "solicitud", "diferencia", "aceptar", "aprobar", "pending"],
    supportSignals: [
      "no se si debo aceptar o solicitar",
      "me enviaron invitacion pero tambien puedo pedir acceso",
      "cual es la diferencia entre invitar y solicitar",
    ],
    screenHints: ["dashboard-invites", "dashboard-request-access", "dashboard-members"],
    body: [
      {
        title: "Qué es",
        paragraphs: [
          "Ambos caminos terminan en membresía de grupo, pero no funcionan igual. La invitación es un acceso iniciado por administración; la solicitud es un acceso iniciado por el residente.",
        ],
      },
      {
        title: "Quién lo usa",
        items: [
          "Residentes que recibieron invitación pero no saben si deben usarla.",
          "Administradores que necesitan orientar mejor a nuevos vecinos.",
        ],
      },
      {
        title: "Antes de empezar",
        items: [
          "Revisa si ya tienes una invitación activa antes de enviar una solicitud nueva.",
          "Confirma si el grupo ya fue definido por la administración o si aún necesita validación.",
        ],
      },
      {
        title: "Cómo distinguirlas",
        items: [
          "Invitación: administración ya eligió el grupo y tú solo confirmas si aceptas o rechazas.",
          "Solicitud: tú eliges el grupo y administración decide si aprueba o rechaza el ingreso.",
          "Si ya existe una invitación correcta, ese suele ser el camino más rápido.",
        ],
      },
      {
        title: "Qué pasa después",
        items: [
          "Una invitación aceptada activa acceso inmediato.",
          "Una solicitud aprobada crea acceso después de revisión manual.",
          "Si se usa el camino equivocado, puede generarse trabajo extra o una espera innecesaria.",
        ],
      },
      {
        title: "Errores o dudas frecuentes",
        items: [
          "No conviene aceptar una invitación si el grupo no corresponde a tu domicilio.",
          "No conviene duplicar una solicitud si ya tienes una invitación pendiente y correcta.",
        ],
      },
    ],
    ctaLinks: [
      { label: "Abrir Invitaciones", href: "/dashboard/invites", intent: "open_invites" },
      { label: "Abrir Solicitar acceso", href: "/dashboard/request-access", intent: "open_request_access" },
      { label: "Gestionar miembros", href: "/dashboard", intent: "open_dashboard" },
    ],
    published: true,
  },
  {
    id: "neighborhood-share-link",
    slug: "como-funciona-el-enlace-compartido-de-colonia",
    title: "Cómo funciona el enlace compartido de colonia",
    summary:
      "Explica cómo un administrador comparte el enlace correcto de colonia para reducir solicitudes mal dirigidas.",
    audience: "admin",
    category: "Acceso",
    roles: ["neighborhood_admin", "group_admin"],
    journey: "access",
    priority: 92,
    keywords: ["enlace", "link", "compartir", "slug", "colonia", "onboarding"],
    supportSignals: [
      "como comparto el link de mi colonia",
      "como precargo la colonia correcta",
      "como envio el enlace a un residente",
    ],
    screenHints: ["dashboard-request-access"],
    body: [
      {
        title: "Qué es",
        paragraphs: [
          "El enlace compartido de colonia abre Solicitar acceso con la colonia ya seleccionada. Así la persona solo tiene que elegir su grupo y completar la solicitud.",
        ],
      },
      {
        title: "Quién lo usa",
        items: [
          "Administradores de colonia.",
          "Equipos que acompañan el alta de nuevos residentes.",
        ],
      },
      {
        title: "Antes de empezar",
        items: [
          "Confirma que la colonia tenga slug activo y visible.",
          "Verifica que el residente entienda qué grupo debe elegir dentro de la colonia.",
        ],
      },
      {
        title: "Cómo hacerlo",
        items: [
          "Abre Solicitar acceso.",
          "En la sección de compartir, copia el enlace correspondiente a tu colonia.",
          "Envíalo por el canal habitual: correo, chat o mensaje directo.",
        ],
      },
      {
        title: "Qué pasa después",
        items: [
          "La persona llega con la colonia bloqueada en pantalla y menos margen de error.",
          "La solicitud sigue necesitando selección de grupo y revisión administrativa.",
          "La administración recibe solicitudes mejor encaminadas y con menos correcciones manuales.",
        ],
      },
      {
        title: "Errores o dudas frecuentes",
        items: [
          "El enlace no agrega a nadie automáticamente; solo prepara el contexto correcto.",
          "Si el usuario no ha iniciado sesión, primero entrará o se registrará y luego volverá al mismo flujo.",
        ],
      },
    ],
    ctaLinks: [
      { label: "Ir a Solicitar acceso", href: "/dashboard/request-access", intent: "open_request_access" },
      { label: "Panel admin", href: "/admin", intent: "open_admin_panel" },
      { label: "Volver al centro de ayuda", href: "/help", intent: "open_help_center" },
    ],
    published: true,
  },
  {
    id: "manage-members-roles",
    slug: "como-administrar-miembros-y-roles",
    title: "Cómo administrar miembros y roles",
    summary:
      "Resume cómo revisar miembros, invitar personas, cambiar roles y mantener ordenado el acceso operativo del grupo.",
    audience: "admin",
    category: "Miembros",
    roles: ["group_admin", "neighborhood_admin"],
    journey: "members",
    priority: 94,
    keywords: ["miembros", "roles", "administrar", "grupo", "admins", "quitar acceso"],
    supportSignals: [
      "como cambio el rol de un vecino",
      "como invito a alguien al grupo",
      "como remuevo a un miembro",
    ],
    screenHints: ["dashboard-members"],
    body: [
      {
        title: "Qué es",
        paragraphs: [
          "La pantalla de miembros concentra la operación diaria del grupo: membresías activas, invitaciones pendientes y solicitudes por revisar.",
        ],
      },
      {
        title: "Quién lo usa",
        items: [
          "Administradores de grupo.",
          "Administradores de colonia que supervisan grupos específicos.",
        ],
      },
      {
        title: "Antes de empezar",
        items: [
          "Confirma si la persona ya tiene acceso, una invitación pendiente o una solicitud abierta.",
          "Antes de bajar permisos, revisa si esa persona sigue operando aprobaciones o gestión de miembros.",
        ],
      },
      {
        title: "Cómo hacerlo",
        items: [
          "Revisa primero la pestaña de miembros para validar quién ya está activo.",
          "Usa la pestaña de invitaciones para enviar, reenviar o cancelar accesos directos.",
          "Cambia roles solo cuando esté claro qué responsabilidad operativa conserva cada persona.",
          "Remueve acceso cuando el vecino ya no debe formar parte del grupo.",
        ],
      },
      {
        title: "Qué pasa después",
        items: [
          "Los cambios de rol modifican las acciones disponibles para esa persona dentro del grupo.",
          "Las invitaciones siguen visibles hasta aceptación, cancelación o expiración.",
          "Si alguien sale de su último grupo activo, también puede perder acceso residente a la colonia.",
        ],
      },
      {
        title: "Errores o dudas frecuentes",
        items: [
          "No conviene dejar al grupo sin ningún administrador activo.",
          "Antes de remover a alguien, verifica si su acceso depende de otra relación activa en la colonia.",
        ],
      },
    ],
    ctaLinks: [
      { label: "Abrir miembros del grupo", href: "/dashboard", intent: "open_group_dashboard" },
      { label: "Revisar solicitudes de acceso", href: "/dashboard/request-access", intent: "open_request_access" },
      { label: "Revisar invitaciones", href: "/dashboard/invites", intent: "open_invites" },
    ],
    published: true,
  },
  {
    id: "approve-access-requests",
    slug: "como-aprobar-o-rechazar-solicitudes-de-acceso",
    title: "Cómo aprobar o rechazar solicitudes de acceso",
    summary:
      "Explica cómo revisar solicitudes de residentes y qué impacto operativo tiene aprobarlas o rechazarlas.",
    audience: "admin",
    category: "Miembros",
    roles: ["group_admin", "neighborhood_admin"],
    journey: "members",
    priority: 91,
    keywords: ["aprobar", "rechazar", "solicitud", "request", "pendiente", "vecino"],
    supportSignals: [
      "como reviso una solicitud de acceso",
      "que debo validar antes de aprobar",
      "como rechazo una solicitud incorrecta",
    ],
    screenHints: ["dashboard-members", "dashboard-request-access"],
    body: [
      {
        title: "Qué es",
        paragraphs: [
          "Las solicitudes de acceso son peticiones de residentes que todavía no pertenecen al grupo. El administrador valida si el ingreso corresponde al grupo correcto antes de autorizarlo.",
        ],
      },
      {
        title: "Quién lo usa",
        items: [
          "Administradores de grupo que revisan ingresos.",
          "Administradores de colonia que supervisan consistencia de acceso.",
        ],
      },
      {
        title: "Antes de empezar",
        items: [
          "Revisa nombre, correo y nota del solicitante.",
          "Confirma si el grupo coincide con domicilio, torre, edificio o criterio interno.",
          "Si existe duda razonable, valida antes de aprobar para evitar accesos erróneos.",
        ],
      },
      {
        title: "Cómo hacerlo",
        items: [
          "Abre la pestaña de solicitudes desde Miembros.",
          "Revisa el contexto del solicitante y la fecha de expiración.",
          "Aprueba si corresponde al grupo o rechaza si debe volver a solicitar al grupo correcto.",
        ],
      },
      {
        title: "Qué pasa después",
        items: [
          "Una solicitud aprobada convierte al residente en miembro activo del grupo.",
          "Una solicitud rechazada no crea acceso y obliga a reintentar el flujo correcto si sigue interesado.",
          "La decisión queda reflejada en el historial operativo del grupo.",
        ],
      },
      {
        title: "Errores o dudas frecuentes",
        items: [
          "Si el usuario eligió el grupo equivocado, suele ser mejor rechazar y reenviarlo correctamente.",
          "Aprobar sin validar identidad o grupo puede generar pagos, avisos y reservaciones mal asignadas.",
        ],
      },
    ],
    ctaLinks: [
      { label: "Abrir miembros del grupo", href: "/dashboard", intent: "open_group_dashboard" },
      { label: "Compartir enlace de colonia", href: "/dashboard/request-access", intent: "open_request_access" },
      { label: "Volver al centro de ayuda", href: "/help", intent: "open_help_center" },
    ],
    published: true,
  },
  {
    id: "funds-payments",
    slug: "como-funcionan-los-fondos-y-pagos",
    title: "Cómo funcionan los fondos y pagos",
    summary:
      "Presenta la lógica general de fondos: qué ve un residente, qué gestiona administración y cómo seguir el estado operativo de pagos.",
    audience: "shared",
    category: "Finanzas",
    roles: ["resident", "group_admin", "neighborhood_admin"],
    journey: "funds",
    priority: 88,
    keywords: ["fondos", "pagos", "saldo", "mantenimiento", "cargo", "periodo"],
    supportSignals: [
      "como pago mantenimiento",
      "que significa un saldo pendiente",
      "como ve admin los fondos",
      "como revisar pagos",
    ],
    screenHints: ["dashboard-funds", "admin-funds"],
    body: [
      {
        title: "Qué es",
        paragraphs: [
          "Los fondos organizan cobros, periodos, movimientos y seguimiento financiero dentro de la colonia. El residente consulta lo que le corresponde y la administración monitorea el panorama completo.",
        ],
      },
      {
        title: "Quién lo usa",
        items: [
          "Residentes que consultan cargos y seguimiento de pagos.",
          "Administradores que gestionan periodos, movimientos y pendientes.",
        ],
      },
      {
        title: "Antes de empezar",
        items: [
          "Confirma que estés en el grupo correcto antes de interpretar saldos o cargos.",
          "Si administras fondos, define si estás revisando panorama general, detalle de un fondo o seguimiento de pagos.",
        ],
      },
      {
        title: "Cómo hacerlo",
        items: [
          "Como residente, entra al módulo de Fondos desde tu grupo para revisar saldos, periodos y detalle.",
          "Como administración, entra a Fondos de la colonia para crear fondos, abrir periodos y revisar pagos pendientes.",
          "Usa el estado operativo de cada fondo para priorizar seguimiento y conciliación.",
        ],
      },
      {
        title: "Qué pasa después",
        items: [
          "Registrar pagos o movimientos cambia el estado operativo del fondo y su balance.",
          "Los residentes ven con más claridad qué deben y qué ya quedó reflejado.",
          "La administración obtiene un control financiero más ordenado y auditable.",
        ],
      },
      {
        title: "Errores o dudas frecuentes",
        items: [
          "Si un residente no encuentra un fondo, primero revisa si pertenece al grupo correcto.",
          "Si un pago sigue pendiente, confirma si ya fue registrado, confirmado o rechazado.",
        ],
      },
    ],
    ctaLinks: [
      { label: "Ver fondos del dashboard", href: "/dashboard", intent: "open_dashboard" },
      { label: "Ir al panel admin", href: "/admin", intent: "open_admin_panel" },
      { label: "Volver al centro de ayuda", href: "/help", intent: "open_help_center" },
    ],
    published: true,
  },
  {
    id: "shared-resources",
    slug: "como-reservar-recursos-compartidos",
    title: "Cómo reservar recursos compartidos",
    summary:
      "Explica cómo consultar disponibilidad, reservar recursos y entender cuándo una fecha está ocupada o bloqueada.",
    audience: "shared",
    category: "Recursos",
    roles: ["resident", "group_admin", "neighborhood_admin"],
    journey: "resources",
    priority: 87,
    keywords: ["reservar", "recurso", "salon", "terraza", "amenidad", "bloqueo", "disponibilidad"],
    supportSignals: [
      "como reservar el salon",
      "por que no aparece disponible una fecha",
      "como bloquear un recurso",
      "como revisar disponibilidad",
    ],
    screenHints: ["dashboard-resources", "admin-resources"],
    body: [
      {
        title: "Qué es",
        paragraphs: [
          "Los recursos compartidos permiten administrar espacios o activos comunes. El residente consulta disponibilidad y reservaciones; la administración controla catálogo, reglas y bloqueos.",
        ],
      },
      {
        title: "Quién lo usa",
        items: [
          "Residentes que necesitan reservar un recurso.",
          "Administradores que configuran disponibilidad, bloqueos y seguimiento operativo.",
        ],
      },
      {
        title: "Antes de empezar",
        items: [
          "Verifica que el recurso esté activo y que tu grupo tenga visibilidad sobre él.",
          "Revisa si la fecha está ocupada por reservación o bloqueada por mantenimiento, limpieza u otra razón.",
        ],
      },
      {
        title: "Cómo hacerlo",
        items: [
          "Como residente, entra al catálogo de recursos de tu grupo y abre el detalle para revisar horarios, reglas y reservas existentes.",
          "Como administración, entra al panel de recursos para crear, editar, bloquear fechas y monitorear uso.",
          "Antes de confirmar una reserva, valida reglas, horarios y requisitos que apliquen.",
        ],
      },
      {
        title: "Qué pasa después",
        items: [
          "Una reservación correcta se refleja en la agenda del recurso y en el historial del grupo.",
          "Los bloqueos reducen conflictos operativos porque sacan de circulación fechas que no deben usarse.",
          "La administración obtiene mejor visibilidad del uso real de cada recurso.",
        ],
      },
      {
        title: "Errores o dudas frecuentes",
        items: [
          "Si un horario no aparece disponible, puede estar reservado o bloqueado.",
          "Si un recurso no aparece al residente, puede no estar habilitado para uso activo o no ser visible para su grupo.",
        ],
      },
    ],
    ctaLinks: [
      { label: "Abrir recursos del dashboard", href: "/dashboard", intent: "open_dashboard" },
      { label: "Abrir recursos del panel admin", href: "/admin", intent: "open_admin_panel" },
      { label: "Volver al centro de ayuda", href: "/help", intent: "open_help_center" },
    ],
    published: true,
  },
  {
    id: "events-posts-polls",
    slug: "como-funcionan-eventos-publicaciones-y-encuestas",
    title: "Cómo funcionan eventos, publicaciones y encuestas",
    summary:
      "Da una visión general de los módulos de comunicación y participación para informar, convocar y tomar decisiones dentro de la colonia.",
    audience: "shared",
    category: "Comunidad",
    roles: ["resident", "group_admin", "neighborhood_admin"],
    journey: "community",
    priority: 80,
    keywords: ["eventos", "publicaciones", "encuestas", "comunicacion", "participacion"],
    supportSignals: [
      "donde veo anuncios del grupo",
      "como organizo un evento",
      "cuando usar encuesta en lugar de publicacion",
    ],
    screenHints: [],
    body: [
      {
        title: "Qué es",
        paragraphs: [
          "Eventos, publicaciones y encuestas cubren tres necesidades distintas: informar, convocar y tomar decisiones. Juntos forman la capa de comunicación de VecinoHub.",
        ],
      },
      {
        title: "Quién lo usa",
        items: [
          "Residentes que necesitan mantenerse informados y participar.",
          "Administradores que comunican, convocan y consultan decisiones.",
        ],
      },
      {
        title: "Antes de empezar",
        items: [
          "Define si necesitas informar, pedir confirmación de asistencia o registrar una decisión.",
          "No todos los mensajes deben publicarse como evento o encuesta; el objetivo del mensaje manda.",
        ],
      },
      {
        title: "Cómo hacerlo",
        items: [
          "Usa Publicaciones para comunicar avisos o contexto operativo.",
          "Usa Eventos para organizar actividades con fecha y hora.",
          "Usa Encuestas cuando necesitas una respuesta estructurada o una decisión registrable.",
        ],
      },
      {
        title: "Qué pasa después",
        items: [
          "Una buena combinación de estos módulos reduce dudas y mejora participación.",
          "Cada módulo deja registro y contexto dentro del grupo o colonia correspondiente.",
        ],
      },
      {
        title: "Errores o dudas frecuentes",
        items: [
          "Una publicación no sustituye una encuesta si necesitas decisión explícita.",
          "Un evento no reemplaza un anuncio si todavía falta contexto operativo.",
        ],
      },
    ],
    ctaLinks: [
      { label: "Abrir dashboard", href: "/dashboard", intent: "open_dashboard" },
      { label: "Abrir perfil", href: "/profile", intent: "open_profile" },
      { label: "Volver al centro de ayuda", href: "/help", intent: "open_help_center" },
    ],
    published: true,
  },
];

const contextHelp: Record<HelpScreenKey, HelpContextEntry[]> = {
  "dashboard-request-access": [
    {
      id: "request-access-resident",
      screenKey: "dashboard-request-access",
      title: "Solicitar acceso paso a paso",
      summary:
        "Sirve para encontrar la colonia correcta, elegir el grupo adecuado y dejar la solicitud lista para revisión.",
      purpose:
        "Esta pantalla resuelve el ingreso cuando la persona todavía no pertenece a un grupo o no recibió invitación directa.",
      whoUsesIt: [
        "Residentes que aún no tienen membresía activa.",
        "Usuarios que necesitan pedir acceso por su cuenta.",
      ],
      beforeYouStart: [
        "Confirma a qué grupo perteneces antes de enviar la solicitud.",
        "Si tienes un enlace compartido, úsalo para llegar con la colonia correcta cargada.",
      ],
      keyActions: [
        "Buscar la colonia por slug o abrirla desde un enlace compartido.",
        "Elegir el grupo correcto.",
        "Agregar una nota breve si administración necesita contexto.",
      ],
      whatHappensNext: [
        "La solicitud queda pendiente hasta revisión administrativa.",
        "Si se aprueba, obtendrás acceso al grupo y a la colonia asociada.",
      ],
      articleSlug: "como-un-residente-se-une-a-un-grupo",
      roles: ["resident"],
      priority: 100,
      triggerIntent: "request_access_flow",
      productLinks: [
        { label: "Ver invitaciones", href: "/dashboard/invites", intent: "open_invites" },
      ],
    },
    {
      id: "request-access-share-link",
      screenKey: "dashboard-request-access",
      title: "Compartir el enlace correcto de colonia",
      summary:
        "Reduce errores porque la persona llega con la colonia ya seleccionada y solo elige su grupo.",
      purpose:
        "Este bloque ayuda a administración a acompañar el alta de nuevos residentes sin tener que explicar el flujo completo cada vez.",
      whoUsesIt: [
        "Administradores de colonia.",
        "Equipos que acompañan onboarding residencial.",
      ],
      beforeYouStart: [
        "Verifica que la colonia tenga slug activo.",
        "Asegúrate de explicar al residente qué grupo debe elegir.",
      ],
      keyActions: [
        "Copiar el enlace de la colonia desde esta misma pantalla.",
        "Compartirlo por correo, chat o mensaje directo.",
      ],
      whatHappensNext: [
        "La persona abre el flujo con la colonia bloqueada en pantalla.",
        "La solicitud llega mejor encaminada y con menos riesgo de error.",
      ],
      articleSlug: "como-funciona-el-enlace-compartido-de-colonia",
      roles: ["neighborhood_admin", "group_admin"],
      priority: 80,
      triggerIntent: "share_join_link",
      productLinks: [{ label: "Volver al centro de ayuda", href: "/help", intent: "open_help_center" }],
    },
  ],
  "dashboard-invites": [
    {
      id: "dashboard-invites-overview",
      screenKey: "dashboard-invites",
      title: "Revisar invitaciones sin crear acceso incorrecto",
      summary:
        "Aquí confirmas si ya existe un acceso directo para ti y si corresponde al grupo correcto antes de aceptarlo.",
      purpose:
        "Esta pantalla evita que el usuario duplique procesos o acepte una membresía equivocada.",
      whoUsesIt: [
        "Residentes invitados a un grupo.",
        "Usuarios que recibieron acceso directo por correo.",
      ],
      beforeYouStart: [
        "Revisa grupo, colonia y remitente antes de aceptar.",
        "Si tienes duda sobre el grupo, valida primero con administración.",
      ],
      keyActions: [
        "Aceptar cuando la invitación corresponde al grupo correcto.",
        "Rechazar si la invitación no aplica o prefieres no continuar.",
      ],
      whatHappensNext: [
        "Aceptar activa acceso inmediato al grupo.",
        "Rechazar deja la invitación cerrada y no crea membresía.",
      ],
      articleSlug: "diferencia-entre-invitacion-y-solicitud-de-acceso",
      roles: ["resident"],
      priority: 100,
      triggerIntent: "invite_acceptance",
      productLinks: [
        { label: "Abrir Solicitar acceso", href: "/dashboard/request-access", intent: "open_request_access" },
      ],
    },
  ],
  "dashboard-members": [
    {
      id: "dashboard-members-roles",
      screenKey: "dashboard-members",
      title: "Operar miembros y roles con orden",
      summary:
        "Esta pantalla reúne miembros activos, invitaciones pendientes y solicitudes por revisar para que el grupo se mantenga limpio.",
      purpose:
        "La meta aquí no es solo ver personas, sino mantener el acceso del grupo alineado con la operación real.",
      whoUsesIt: [
        "Administradores de grupo.",
        "Administradores de colonia con supervisión sobre el grupo.",
      ],
      beforeYouStart: [
        "Confirma si la persona ya está activa, invitada o solicitando acceso.",
        "Antes de cambiar permisos, revisa quién sigue cubriendo tareas administrativas.",
      ],
      keyActions: [
        "Revisar miembros activos.",
        "Invitar personas nuevas o reenviar invitaciones.",
        "Cambiar roles o remover acceso cuando haga falta.",
      ],
      whatHappensNext: [
        "Los cambios de rol afectan lo que cada persona puede gestionar.",
        "Las invitaciones, solicitudes y membresías cambian el estado operativo del grupo.",
      ],
      articleSlug: "como-administrar-miembros-y-roles",
      roles: ["group_admin", "neighborhood_admin"],
      priority: 100,
      triggerIntent: "manage_group_members",
      productLinks: [
        { label: "Ir a Solicitar acceso", href: "/dashboard/request-access", intent: "open_request_access" },
        { label: "Ir a Invitaciones", href: "/dashboard/invites", intent: "open_invites" },
      ],
    },
    {
      id: "dashboard-members-requests",
      screenKey: "dashboard-members",
      title: "Aprobar o rechazar solicitudes correctamente",
      summary:
        "Desde la pestaña de solicitudes validas si una persona sí corresponde al grupo antes de darle entrada.",
      purpose:
        "Este bloque sirve para evitar altas equivocadas que luego generan avisos, pagos o reservaciones mal asignadas.",
      whoUsesIt: ["Administradores que aprueban o rechazan ingresos."],
      beforeYouStart: [
        "Revisa nombre, correo y nota del solicitante.",
        "Valida que el grupo elegido sí corresponda.",
      ],
      keyActions: [
        "Aprobar cuando la persona sí corresponde al grupo.",
        "Rechazar cuando necesita volver a solicitar al grupo correcto.",
      ],
      whatHappensNext: [
        "Aprobar crea acceso activo.",
        "Rechazar evita una membresía incorrecta y obliga a reintentar el flujo correcto.",
      ],
      articleSlug: "como-aprobar-o-rechazar-solicitudes-de-acceso",
      roles: ["group_admin", "neighborhood_admin"],
      priority: 90,
      triggerIntent: "review_access_request",
      productLinks: [{ label: "Ver guía completa", href: "/help", intent: "open_help_center" }],
    },
  ],
  "dashboard-funds": [
    {
      id: "dashboard-funds-overview",
      screenKey: "dashboard-funds",
      title: "Leer fondos como residente",
      summary:
        "Esta vista resume fondos activos, saldos y detalle operativo para tu grupo.",
      purpose:
        "Su objetivo es ayudarte a entender qué fondos te aplican y cómo seguir cargos, periodos y pagos.",
      whoUsesIt: ["Residentes que consultan pagos, saldos y periodos."],
      beforeYouStart: [
        "Confirma que estás viendo el grupo correcto.",
        "Si algo no te cuadra, revisa primero el estado del cargo o del pago.",
      ],
      keyActions: [
        "Revisar qué fondos están activos.",
        "Entrar a un fondo para consultar detalle y periodos relacionados.",
      ],
      whatHappensNext: [
        "El detalle del fondo te ayuda a entender montos, historial y seguimiento del grupo.",
      ],
      articleSlug: "como-funcionan-los-fondos-y-pagos",
      roles: ["resident"],
      priority: 100,
      triggerIntent: "resident_funds_overview",
      productLinks: [{ label: "Volver al centro de ayuda", href: "/help", intent: "open_help_center" }],
    },
  ],
  "dashboard-resources": [
    {
      id: "dashboard-resources-overview",
      screenKey: "dashboard-resources",
      title: "Consultar recursos y disponibilidad",
      summary:
        "Aquí comparas recursos activos, revisas capacidad y entras al detalle para reservar o confirmar disponibilidad.",
      purpose:
        "Esta vista sirve para identificar si el recurso correcto está disponible antes de iniciar una reservación.",
      whoUsesIt: ["Residentes que quieren reservar un recurso del vecindario."],
      beforeYouStart: [
        "Revisa si el recurso está activo y visible para tu grupo.",
        "Si una fecha no aparece, podría estar reservada o bloqueada.",
      ],
      keyActions: [
        "Comparar recursos disponibles.",
        "Abrir detalle para revisar reglas y horarios.",
        "Consultar historial de reservaciones del grupo.",
      ],
      whatHappensNext: [
        "Desde el detalle podrás confirmar si el recurso sí se ajusta a tu necesidad antes de reservar.",
      ],
      articleSlug: "como-reservar-recursos-compartidos",
      roles: ["resident"],
      priority: 100,
      triggerIntent: "resident_resources_overview",
      productLinks: [{ label: "Mis reservaciones", href: "/dashboard", intent: "open_dashboard" }],
    },
  ],
  "admin-funds": [
    {
      id: "admin-funds-overview",
      screenKey: "admin-funds",
      title: "Gestionar fondos con seguimiento operativo",
      summary:
        "Administración ve aquí el panorama consolidado de balance, periodos abiertos y pagos pendientes.",
      purpose:
        "La pantalla existe para priorizar seguimiento financiero, no solo para listar fondos.",
      whoUsesIt: [
        "Administradores de colonia.",
        "Responsables financieros u operativos.",
      ],
      beforeYouStart: [
        "Define si vas a crear un fondo nuevo, revisar balances o dar seguimiento a pendientes.",
      ],
      keyActions: [
        "Crear fondos nuevos.",
        "Entrar a un fondo para revisar movimientos, periodos y configuración.",
        "Monitorear pendientes para priorizar seguimiento.",
      ],
      whatHappensNext: [
        "Cada fondo se vuelve una unidad clara de control financiero para la colonia.",
      ],
      articleSlug: "como-funcionan-los-fondos-y-pagos",
      roles: ["neighborhood_admin"],
      priority: 100,
      triggerIntent: "admin_funds_overview",
      productLinks: [{ label: "Ir al panel admin", href: "/admin", intent: "open_admin_panel" }],
    },
  ],
  "admin-resources": [
    {
      id: "admin-resources-overview",
      screenKey: "admin-resources",
      title: "Administrar catálogo, bloqueos y reservaciones",
      summary:
        "Aquí se centralizan recursos, disponibilidad, bloqueos futuros y reservaciones en curso.",
      purpose:
        "Esta pantalla ayuda a mantener la operación de recursos ordenada y evitar conflictos de agenda.",
      whoUsesIt: ["Administradores que operan espacios o recursos compartidos."],
      beforeYouStart: [
        "Revisa si el problema es de catálogo, disponibilidad, bloqueo o reservación existente.",
      ],
      keyActions: [
        "Crear recursos nuevos.",
        "Revisar ocupación, bloqueos futuros y capacidad.",
        "Abrir reservaciones o bloqueos para dar seguimiento operativo.",
      ],
      whatHappensNext: [
        "Una configuración correcta mejora la disponibilidad visible para residentes y reduce conflictos.",
      ],
      articleSlug: "como-reservar-recursos-compartidos",
      roles: ["neighborhood_admin"],
      priority: 100,
      triggerIntent: "admin_resources_overview",
      productLinks: [{ label: "Ir al panel admin", href: "/admin", intent: "open_admin_panel" }],
    },
  ],
};

const quickAnswers: HelpQuickAnswer[] = [
  {
    id: "request-access-no-invite",
    screenKey: "dashboard-request-access",
    question: "¿Qué hago si no tengo invitación?",
    answer:
      "Usa esta pantalla para buscar tu colonia, elegir tu grupo y dejar una solicitud para revisión. Ese es el flujo correcto cuando administración todavía no te invitó directamente.",
    articleSlug: "como-un-residente-se-une-a-un-grupo",
    roles: ["resident"],
    priority: 100,
  },
  {
    id: "request-access-share-link-autojoin",
    screenKey: "dashboard-request-access",
    question: "¿El enlace compartido me agrega automáticamente?",
    answer:
      "No. El enlace solo deja la colonia precargada. Aún necesitas elegir tu grupo y enviar la solicitud para que administración la revise.",
    articleSlug: "como-funciona-el-enlace-compartido-de-colonia",
    roles: ["resident", "neighborhood_admin"],
    priority: 90,
  },
  {
    id: "members-invite-vs-approve",
    screenKey: "dashboard-members",
    question: "¿Cuándo conviene invitar y cuándo aprobar una solicitud?",
    answer:
      "Invita cuando administración ya sabe exactamente a qué grupo debe entrar la persona. Aprueba una solicitud cuando el residente inició el proceso y necesitas validar que el grupo sí es el correcto.",
    articleSlug: "diferencia-entre-invitacion-y-solicitud-de-acceso",
    roles: ["group_admin", "neighborhood_admin"],
    priority: 100,
  },
  {
    id: "members-role-change-impact",
    screenKey: "dashboard-members",
    question: "¿Qué cambia cuando modifico un rol?",
    answer:
      "Cambiar el rol modifica las acciones que esa persona puede realizar dentro del grupo. Antes de bajar permisos, confirma quién seguirá operando aprobaciones, membresías o seguimiento administrativo.",
    articleSlug: "como-administrar-miembros-y-roles",
    roles: ["group_admin", "neighborhood_admin"],
    priority: 90,
  },
];

const screenLabels: Record<HelpScreenKey, string> = {
  "dashboard-request-access": "Solicitar acceso",
  "dashboard-invites": "Invitaciones",
  "dashboard-members": "Miembros del grupo",
  "dashboard-funds": "Fondos del grupo",
  "dashboard-resources": "Recursos del grupo",
  "admin-funds": "Fondos de la colonia",
  "admin-resources": "Recursos de la colonia",
};

const startHereByRole: Record<Exclude<HelpRole, "shared">, HelpJourney[]> = {
  resident: ["access", "funds", "resources", "community"],
  group_admin: ["members", "access", "funds", "resources"],
  neighborhood_admin: ["access", "members", "funds", "resources"],
};

function roleMatches(roles: HelpRole[], role: HelpRole) {
  return roles.includes("shared") || roles.includes(role);
}

function articleBodyText(article: HelpArticle) {
  return article.body
    .flatMap((section) => [section.title, ...(section.paragraphs ?? []), ...(section.items ?? [])])
    .join(" ")
    .toLowerCase();
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function queryTerms(query: string) {
  return normalize(query)
    .split(/\s+/)
    .filter(Boolean);
}

function scoreSearch(article: HelpArticle, query: string, role: HelpRole) {
  const normalized = normalize(query);
  if (!normalized) {
    return 0;
  }

  const title = article.title.toLowerCase();
  const summary = article.summary.toLowerCase();
  const category = article.category.toLowerCase();
  const keywords = article.keywords.map((item) => item.toLowerCase());
  const supportSignals = article.supportSignals.map((item) => item.toLowerCase());
  const body = articleBodyText(article);
  let score = 0;

  if (title === normalized) {
    score += 140;
  } else if (title.startsWith(normalized)) {
    score += 120;
  } else if (title.includes(normalized)) {
    score += 90;
  }

  if (summary.includes(normalized)) {
    score += 50;
  }

  if (category.includes(normalized)) {
    score += 45;
  }

  if (keywords.some((item) => item === normalized)) {
    score += 90;
  } else if (keywords.some((item) => item.includes(normalized))) {
    score += 70;
  }

  if (supportSignals.some((item) => item.includes(normalized))) {
    score += 60;
  }

  if (body.includes(normalized)) {
    score += 25;
  }

  const terms = queryTerms(query);
  if (terms.length > 1) {
    for (const term of terms) {
      if (title.includes(term)) {
        score += 18;
      }
      if (keywords.some((item) => item.includes(term))) {
        score += 15;
      }
      if (supportSignals.some((item) => item.includes(term))) {
        score += 12;
      }
      if (summary.includes(term) || body.includes(term)) {
        score += 6;
      }
    }
  }

  if (roleMatches(article.roles, role)) {
    score += article.roles.includes(role) ? 20 : 8;
  }

  score += article.priority / 10;
  return score;
}

function scoreFeatured(article: HelpArticle, role: HelpRole, screenKey?: HelpScreenKey) {
  let score = article.priority;

  if (roleMatches(article.roles, role)) {
    score += article.roles.includes(role) ? 35 : 12;
  }

  if (screenKey && article.screenHints.includes(screenKey)) {
    score += 18;
  }

  return score;
}

function scoreRelated(base: HelpArticle, candidate: HelpArticle, role: HelpRole) {
  let score = candidate.priority;
  if (candidate.journey === base.journey) {
    score += 50;
  }
  if (candidate.category === base.category) {
    score += 35;
  }
  if (roleMatches(candidate.roles, role)) {
    score += candidate.roles.includes(role) ? 18 : 6;
  }

  const sharedKeywords = candidate.keywords.filter((keyword) => base.keywords.includes(keyword)).length;
  score += sharedKeywords * 8;

  const sharedScreens = candidate.screenHints.filter((screen) => base.screenHints.includes(screen)).length;
  score += sharedScreens * 6;

  return score;
}

function sortByScore<T>(items: T[], score: (item: T) => number) {
  return [...items].sort((left, right) => score(right) - score(left));
}

export function resolveHelpRole({
  accountRole,
  hasNeighborhoodAdminAccess = false,
  viewerCanManage = false,
  viewerMembershipRole = null,
}: HelpRoleResolverInput): HelpRole {
  if (accountRole === "platform_admin" || hasNeighborhoodAdminAccess) {
    return "neighborhood_admin";
  }

  if (viewerMembershipRole === "group_admin" || viewerCanManage || accountRole === "admin") {
    return "group_admin";
  }

  return "resident";
}

export function listHelpArticles(locale: string) {
  void locale;
  return sortByScore(
    helpArticles.filter((article) => article.published),
    (article) => article.priority
  );
}

export function getHelpArticleBySlug(locale: string, slug: string) {
  void locale;
  return helpArticles.find((article) => article.published && article.slug === slug) ?? null;
}

export function listFeaturedHelpArticles({ locale, role, limit = 4, screenKey }: FeaturedSelectorInput) {
  return sortByScore(
    listHelpArticles(locale).filter((article) => roleMatches(article.roles, role)),
    (article) => scoreFeatured(article, role, screenKey)
  ).slice(0, limit);
}

export function listStartHereHelpArticles({ locale, role }: HelpSelectorBase) {
  const journeyOrder = role === "shared" ? ["access", "members", "funds", "resources"] : startHereByRole[role];
  const articles = listHelpArticles(locale).filter((article) => roleMatches(article.roles, role));

  return journeyOrder
    .map((journey) =>
      sortByScore(
        articles.filter((article) => article.journey === journey),
        (article) => scoreFeatured(article, role)
      )[0]
    )
    .filter((article): article is HelpArticle => Boolean(article))
    .slice(0, 4);
}

export function searchHelpArticles({ locale, query, role }: SearchSelectorInput) {
  const normalized = normalize(query);
  if (!normalized) {
    return listHelpArticles(locale);
  }

  return sortByScore(
    listHelpArticles(locale).filter((article) => scoreSearch(article, query, role) > 0),
    (article) => scoreSearch(article, query, role)
  );
}

export function listRelatedHelpArticles({ locale, slug, role, limit = 3 }: RelatedSelectorInput) {
  const article = getHelpArticleBySlug(locale, slug);
  if (!article) {
    return [];
  }

  return sortByScore(
    listHelpArticles(locale).filter((candidate) => candidate.slug !== article.slug),
    (candidate) => scoreRelated(article, candidate, role)
  )
    .filter((candidate) => roleMatches(candidate.roles, role))
    .slice(0, limit);
}

export function listContextHelpByScreen({
  locale,
  screenKey,
  role,
}: {
  locale: string;
  screenKey: HelpScreenKey;
  role: HelpRole;
}) {
  void locale;
  const entries = contextHelp[screenKey] ?? [];
  const filtered = entries.filter((entry) => roleMatches(entry.roles, role));

  return sortByScore(filtered.length > 0 ? filtered : entries, (entry) => entry.priority);
}

export function listContextQuickAnswers({
  locale,
  screenKey,
  role,
}: {
  locale: string;
  screenKey: HelpScreenKey;
  role: HelpRole;
}) {
  void locale;
  return sortByScore(
    quickAnswers.filter(
      (item) => item.screenKey === screenKey && roleMatches(item.roles, role)
    ),
    (item) => item.priority
  );
}

export function getHelpScreenLabel(locale: string, screenKey: HelpScreenKey) {
  void locale;
  return screenLabels[screenKey];
}
