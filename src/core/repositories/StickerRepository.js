import { configRepository } from './ConfigRepository.js'

const STICKER_CATEGORIES = [
  {
    name: 'Territorio y sociedad',
    stickers: [
      'mapa-argentina',
      'sudamerica',
      'malvinas-argentinas',
      'bandera-argentina',
      'escarapela',
      'escudo-nacional',
      'geolocalizacion',
      'barrio',
      'casa',
      'paisaje-urbano-3',
      'espacio-publico',
      'pueblos-originarios',
      'genero',
      'discapacidad',
      'institucion',
      'casa-rosada',
      'congreso',
      'justicia-negativo',
      'escuela',
      'biblioteca',
      'hospital',
      'cruz-medicina',
      'enfermera',
      'vacuna',
      'bomberos-mujer',
      'cenie'
    ],
    patterns: [/^provincia-/]
  },
  {
    name: 'Ambiente y naturaleza',
    stickers: [
      'agua',
      'aire',
      'arbol',
      'bosques',
      'cardon',
      'desierto',
      'hojas',
      'nube',
      'olas',
      'frio',
      'derrumbes',
      'erupciones-volcanicas',
      'inundaciones',
      'fuego',
      'mosquito',
      'gato',
      'perro',
      'serpiente'
    ],
    patterns: [/^clima-/]
  },
  {
    name: 'Producción y economía',
    stickers: [
      'ganaderia',
      'tambo',
      'cerdo',
      'gallina',
      'huerta',
      'maiz',
      'trigo-2',
      'frutilla',
      'manzana',
      'pera',
      'tomate',
      'uvas',
      'zanahorias',
      'zapallo',
      'frutas-y-verduras',
      'tractor-G1',
      'pesca',
      'pescado',
      'mineria',
      'petroleo',
      'industria',
      'siderurgia',
      'empresas-e-industria',
      'economias-regionales',
      'comercio',
      'bolsa-compras',
      'bolsa-dinero',
      'carrito',
      'pesos',
      'comida',
      'herramientas',
      'camion-construccion'
    ]
  },
  {
    name: 'Infraestructura, transporte y energía',
    stickers: [
      'aeropuerto',
      'auto',
      'micro',
      'tren',
      'ruta',
      'puentes',
      'semaforo',
      'caminar',
      'embarcacion',
      'fragata',
      'navegacion',
      'faro',
      'elevacion-de-andenes',
      'electricidad',
      'torre-electrica',
      'energia-eolica',
      'energia-hidroelectrica',
      'energia-solar',
      'represa-hidroelectrica',
      'central-nuclear',
      'radiacion-nuclear',
      'molino'
    ]
  },
  {
    name: 'Ciencia, tecnología y actividades',
    stickers: [
      'ciencia',
      'computadora',
      'comunicacion',
      'microscopio',
      'probeta',
      'satelite',
      'ingenieria-sismica',
      'lampara',
      'campamento',
      'trekking',
      'deporte',
      'cine'
    ]
  },
  {
    name: 'Recursos gráficos',
    stickers: [
      'corazon',
      'corazon-lineal',
      'paleta-colores',
      'numero-0',
      'numero-1',
      'numero-2',
      'numero-3',
      'numero-4',
      'numero-5',
      'numero-6',
      'numero-7',
      'numero-8',
      'numero-9'
    ]
  }
]

export class StickerRepository {
  async getAll() {
    if (!configRepository.config) {
      await configRepository.load()
    }
    return configRepository.getStickers()
  }

  async getCategorized() {
    const allStickers = await this.getAll()

    const categoriesMap = STICKER_CATEGORIES.map((cat) => ({
      name: cat.name,
      stickers: []
    }))

    for (const sticker of allStickers) {
      const catIndex = STICKER_CATEGORIES.findIndex((cat) => {
        if (cat.stickers && cat.stickers.includes(sticker)) {
          return true
        }
        if (cat.patterns && cat.patterns.some((pattern) => pattern.test(sticker))) {
          return true
        }
        return false
      })

      if (catIndex !== -1) {
        categoriesMap[catIndex].stickers.push(sticker)
      } else {
        console.warn(`Sticker unclassified: ${sticker}`)
      }
    }

    return categoriesMap
  }
}

export const stickerRepository = new StickerRepository()

