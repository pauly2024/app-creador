import { CategoryType, SubPackage } from './types';

export const PACKAGES_DATA: Record<CategoryType, SubPackage[]> = {
  'Desarrollo Web': [
    {
      id: 'web-basica',
      name: 'Web Básica Emprendedor',
      price: 'RD$ 8,500',
      description: 'Hasta 3 páginas (Inicio, Servicios y Contacto)',
      features: [
        'Diseño responsivo para móvil y computadora',
        'Formulario de contacto con WhatsApp',
        'Botones a redes sociales',
        'Instalación en hosting y dominio'
      ],
      deliveryTime: '7-10 días hábiles',
      revisions: 'Hasta 2 rondas',
      paymentTerms: '50% adelantado, 50% al entregar'
    },
    {
      id: 'web-plus',
      name: 'Web Emprendedor Plus',
      price: 'RD$ 12,500',
      description: 'Hasta 5 páginas (Inicio, Servicios, Nosotros, Portafolio y Contacto)',
      features: [
        'Diseño personalizado según la marca',
        'Formulario de contacto avanzado con WhatsApp',
        'Integración básica con Google Analytics',
        'SEO on-page básico'
      ],
      deliveryTime: '10-15 días hábiles',
      revisions: 'Hasta 3 rondas',
      paymentTerms: '50% adelantado, 50% al aprobar'
    },
    {
      id: 'landing-page',
      name: 'Landing Page Básica',
      price: 'RD$ 15,000',
      description: 'Diseño responsivo y enfocado a conversión',
      features: [
        'Formulario de contacto',
        'SEO básico',
        '1 página'
      ],
      deliveryTime: '7-10 días hábiles',
      revisions: 'Hasta 2 rondas',
      paymentTerms: '50% adelantado, 50% al entregar'
    },
    {
      id: 'web-premium',
      name: 'Web Profesional Premium',
      price: 'RD$ 18,000',
      description: 'Hasta 8 páginas o landing page completa',
      features: [
        'Diseño avanzado y trabajado visualmente',
        'Sección de portafolio o catálogo',
        'Optimización de velocidad y performance',
        'SEO on-page mejorado + Google Analytics + Search Console',
        '1 sesión de asesoría online'
      ],
      deliveryTime: '15-20 días hábiles',
      revisions: 'Hasta 4 rondas',
      paymentTerms: '50% adelantado, 50% al publicar'
    }
  ],
  'Aplicaciones Web': [
    {
      id: 'app-express',
      name: 'App Premium Express',
      price: 'RD$ 25,000',
      description: 'App avanzada con roles de usuario en tiempo récord',
      features: [
        'Hasta 8 módulos o funcionalidades',
        'Diseño personalizado según marca',
        'Hosting, dominio y SSL x 1 año',
        'Base de datos funcional',
        'Panel admin básico',
        'Integraciones estándar',
        'Diseño UX/UI profesional'
      ],
      deliveryTime: '7 a 10 días hábiles',
      revisions: '3 rondas',
      paymentTerms: '50% adelantado, 50% final'
    },
    {
      id: 'app-corporativa',
      name: 'App Corporativa',
      price: 'RD$ 45,000',
      description: 'App empresarial robusta y escalable',
      features: [
        'Hasta 12 módulos o funcionalidades',
        'Base de datos compleja y optimizada',
        'Panel admin avanzado con estadísticas',
        'Integraciones múltiples (pagos, APIs)',
        'Sistema de reportes avanzado',
        'Diseño UX/UI de alto nivel',
        'Documentación técnica completa',
        'Capacitación de personal'
      ],
      deliveryTime: '30-45 días hábiles',
      revisions: '5 rondas',
      paymentTerms: '50% adelantado, 30% a mitad, 20% final'
    }
  ],
  'Social Media': [
    {
      id: 'sm-starter',
      name: 'Redes Starter Mensual',
      price: 'RD$ 8,500',
      description: 'Gestión básica para emprendedores',
      features: [
        '12 publicaciones mensuales',
        '2 redes sociales',
        'Diseño de posts y stories',
        'Copywriting estratégico',
        'Programación de contenido',
        'Reporte mensual de métricas'
      ],
      deliveryTime: 'Mensual',
      revisions: 'N/A',
      paymentTerms: 'Pago mensual por adelantado'
    },
    {
      id: 'sm-pro',
      name: 'Redes Pro Mensual',
      price: 'RD$ 15,000',
      description: 'Gestión profesional con mayor alcance',
      features: [
        '20 publicaciones mensuales',
        '3 redes sociales',
        'Diseño avanzado y personalizado',
        'Gestión de comunidad (comentarios/DMs)',
        '4 Reels/Videos editados al mes',
        'Estrategia de crecimiento',
        'Reporte detallado con insights'
      ],
      deliveryTime: 'Mensual',
      revisions: 'N/A',
      paymentTerms: 'Pago mensual por adelantado'
    },
    {
      id: 'sm-business',
      name: 'Redes Business Mensual',
      price: 'RD$ 25,000',
      description: 'Gestión integral para empresas',
      features: [
        '30 publicaciones mensuales (diario)',
        'Todas las redes sociales relevantes',
        'Producción de contenido audiovisual',
        'Gestión total de comunidad 24/7',
        'Campañas de Ads (gestión)',
        'Influencer marketing (coordinación)',
        'Reporte ejecutivo quincenal'
      ],
      deliveryTime: 'Mensual',
      revisions: 'N/A',
      paymentTerms: 'Pago mensual por adelantado'
    }
  ],
  'Branding': [
    {
      id: 'brand-identidad',
      name: 'Identidad Visual',
      price: 'RD$ 8,500',
      description: 'Esencia visual de tu marca',
      features: [
        'Logo principal y variantes',
        'Paleta de colores corporativa',
        'Tipografías seleccionadas',
        'Manual de identidad básico',
        'Formatos para web e impresión'
      ],
      deliveryTime: '7-10 días hábiles',
      revisions: '3 rondas',
      paymentTerms: '50% adelantado, 50% al entregar'
    },
    {
      id: 'brand-pro',
      name: 'Branding Pro',
      price: 'RD$ 15,000',
      description: 'Identidad corporativa completa',
      features: [
        'Todo lo del paquete Identidad Visual',
        'Diseño de papelería (tarjetas, hojas)',
        '5 plantillas para redes sociales',
        'Manual de marca extendido',
        'Aplicaciones en mockups reales'
      ],
      deliveryTime: '15-20 días hábiles',
      revisions: '4 rondas',
      paymentTerms: '50% adelantado, 50% al aprobar'
    },
    {
      id: 'brand-corporativo',
      name: 'Branding Corporativo',
      price: 'RD$ 25,000',
      description: 'Sistema de marca integral y estratégico',
      features: [
        'Todo lo del paquete Branding Pro',
        'Estrategia de marca y posicionamiento',
        'Naming (si es necesario)',
        'Diseño de empaques o uniformes',
        'Manual de marca corporativo completo',
        'Asesoría de implementación'
      ],
      deliveryTime: '25-30 días hábiles',
      revisions: 'Ilimitadas (hasta satisfacción)',
      paymentTerms: '50% adelantado, 50% al finalizar'
    }
  ]
};
