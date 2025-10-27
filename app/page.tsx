"use client"
import { useState } from "react"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Bell, DollarSign, CreditCard, Plus, Edit, Trash2, Save, X, CheckCircle, TrendingDown } from "lucide-react"

export default function PanelControlFinanzas() {
  const [vista, setVista] = useState("config")
  const [supabaseUrl, setSupabaseUrl] = useState("")
  const [supabaseKey, setSupabaseKey] = useState("")
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("")
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [conectado, setConectado] = useState(false)
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" })
  const [cargando, setCargando] = useState(false)

  // Tipos mínimos para los arrays de estado (ajusta propiedades según tu esquema si lo deseas)
  type Recordatorio = any
  type Gasto = any
  type Deuda = {
    id: string | number
    nombre: string
    monto_total: number
    monto_pagado: number
    monto_ahorrado: number
    cuota_mensual?: number
    tiene_interes?: boolean
    fecha_inicio?: string
    [key: string]: any
  }
  type Ingreso = any

  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [gastosDetallados, setGastosDetallados] = useState<Gasto[]>([])
  const [deudas, setDeudas] = useState<Deuda[]>([])
  const [ingresos, setIngresos] = useState<Ingreso[]>([])
  const [ingresoMensual, setIngresoMensual] = useState(4500)
  const [limiteGastos, setLimiteGastos] = useState(50)

  const [modalGasto, setModalGasto] = useState(false)
  const [imagenGasto, setImagenGasto] = useState<File | null>(null)
  const [formGasto, setFormGasto] = useState<{
    monto?: string
    categoria: string
    descripcion?: string
    metodo_pago?: string
    fecha?: string
    hora?: string
  }>({
    categoria: "alimentacion",
  })

  const [modalIngreso, setModalIngreso] = useState(false)
  const [formIngreso, setFormIngreso] = useState({
    monto: "",
    categoria: "salario",
    descripcion: "",
    fecha: new Date().toISOString().split("T")[0],
  })

  const [modalRecordatorio, setModalRecordatorio] = useState(false)
  const [modalDeuda, setModalDeuda] = useState(false)
  const [modalPagoDeuda, setModalPagoDeuda] = useState(false)
  const [deudaSeleccionada, setDeudaSeleccionada] = useState<Deuda | null>(null)
  const [editando, setEditando] = useState<string | number | null>(null)

  const [formRecordatorio, setFormRecordatorio] = useState({
    nombre: "",
    monto: "",
    dia_mes: 1,
    telefono: "591",
    categoria: "alquiler",
    notas: "",
  })

  const [formDeuda, setFormDeuda] = useState({
    nombre: "",
    monto_total: "",
    cuota_mensual: "",
    tiene_interes: false,
    fecha_inicio: "",
  })

  const [formPagoDeuda, setFormPagoDeuda] = useState({
    monto: "",
    tipo: "pago",
    notas: "",
  })

  const conectarSupabase = async () => {
    if (!supabaseUrl || !supabaseKey) {
      mostrarMensaje("error", "❌ Completa URL y API Key")
      return
    }

    try {
      const client = createClient(supabaseUrl, supabaseKey)
      const { data, error } = await client.from("configuracion").select("*").limit(1)

      if (error) {
        mostrarMensaje("error", "❌ Error: " + error.message)
        return
      }

      setSupabase(client)
      setConectado(true)
      mostrarMensaje("success", "✅ Conectado a Supabase")
      cargarDatos(client)
    } catch (error) {
      if (error instanceof Error) {
        mostrarMensaje("error", "❌ Error de conexión: " + error.message)
      } else {
        mostrarMensaje("error", "❌ Error desconocido: " + String(error))
      }
    }
  }

  const mostrarMensaje = (tipo: string, texto: string) => {
    setMensaje({ tipo, texto })
    setTimeout(() => setMensaje({ tipo: "", texto: "" }), 5000)
  }

  const cargarDatos = async (client = supabase) => {
    if (!client) return

    try {
      setCargando(true)

      const { data: recordatoriosData } = await client
        .from("recordatorios")
        .select("*")
        .order("dia_mes", { ascending: true })
      setRecordatorios(recordatoriosData || [])

      const { data: deudasData } = await client
        .from("deudas")
        .select("*")
        .eq("activo", true)
        .order("created_at", { ascending: false })
      setDeudas(deudasData || [])

      const inicioMes = new Date()
      inicioMes.setDate(1)

      const { data: gastosData } = await client
        .from("gastos")
        .select("categoria, monto")
        .gte("fecha", inicioMes.toISOString().split("T")[0])

      const gastosAgrupados = (gastosData || []).reduce(
        (acc: { categoria: string; monto: number }[], g: any) => {
          const cat = g.categoria || "Sin categoría"
          const existing = acc.find((item) => item.categoria === cat)
          if (existing) {
            existing.monto += Number.parseFloat(g.monto)
          } else {
            acc.push({ categoria: cat, monto: Number.parseFloat(g.monto) })
          }
          return acc
        },
        [] as { categoria: string; monto: number }[]
      )
      setGastos(gastosAgrupados)

      const { data: gastosDetalladosData } = await client
        .from("gastos")
        .select("*")
        .gte("fecha", inicioMes.toISOString().split("T")[0])
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false })
      setGastosDetallados(gastosDetalladosData || [])

      const { data: ingresosData } = await client
        .from("ingresos")
        .select("*")
        .gte("fecha", inicioMes.toISOString().split("T")[0])
        .order("fecha", { ascending: false })
      setIngresos(ingresosData || [])

      const { data: configData } = await client.from("configuracion").select("*")
      const configMap = (configData || []).reduce((acc, c) => {
        acc[c.clave] = c.valor
        return acc
      }, {})

      if (configMap.ingreso_mensual) setIngresoMensual(Number.parseFloat(configMap.ingreso_mensual))
      if (configMap.limite_gastos_porcentaje) setLimiteGastos(Number.parseFloat(configMap.limite_gastos_porcentaje))

      setCargando(false)
      mostrarMensaje("success", "✅ Datos cargados")
    } catch (error) {
      setCargando(false)
      if (error instanceof Error) {
        mostrarMensaje("error", "❌ Error de conexión: " + error.message)
      } else {
        mostrarMensaje("error", "❌ Error desconocido: " + String(error))
      }
    }
  }

  const guardarIngreso = async () => {
    if (!supabase || !formIngreso.monto) {
      mostrarMensaje("error", "❌ Completa el monto del ingreso")
      return
    }

    try {
      setCargando(true)

      if (editando) {
        const { error } = await supabase.from("ingresos").update(formIngreso).eq("id", editando)
        if (error) throw error
        mostrarMensaje("success", "✅ Ingreso actualizado")
      } else {
        const { error } = await supabase.from("ingresos").insert([formIngreso])
        if (error) throw error
        mostrarMensaje("success", "✅ Ingreso registrado")
      }

      setModalIngreso(false)
      setEditando(null)
      setFormIngreso({
        monto: "",
        categoria: "salario",
        descripcion: "",
        fecha: new Date().toISOString().split("T")[0],
      })
      await cargarDatos()
    } catch (error) {
      if (error instanceof Error) {
        mostrarMensaje("error", "❌ Error de conexión: " + error.message)
      } else {
        mostrarMensaje("error", "❌ Error desconocido: " + String(error))
      }
    }
    setCargando(false)
  }

  const eliminarIngreso = async (id: string | number) => {
    if (!supabase) return
    try {
      const { error } = await supabase.from("ingresos").delete().eq("id", id)
      if (error) throw error
      mostrarMensaje("success", "✅ Ingreso eliminado")
      await cargarDatos()
    } catch (error) {
      if (error instanceof Error) {
        mostrarMensaje("error", "❌ Error de conexión: " + error.message)
      } else {
        mostrarMensaje("error", "❌ Error desconocido: " + String(error))
      }
    }
  }

  const editarGasto = (gasto: Gasto) => {
    setEditando(gasto.id)
    setFormGasto({
      monto: gasto.monto,
      categoria: gasto.categoria,
      descripcion: gasto.descripcion || "",
      metodo_pago: gasto.metodo_pago,
    })
    setModalGasto(true)
  }

  const eliminarGasto = async (id: string | number) => {
    if (!supabase) return
    try {
      const { error } = await supabase.from("gastos").delete().eq("id", id)
      if (error) throw error
      mostrarMensaje("success", "✅ Gasto eliminado")
      await cargarDatos()
    } catch (error) {
      if (error instanceof Error) {
        mostrarMensaje("error", "❌ Error de conexión: " + error.message)
      } else {
        mostrarMensaje("error", "❌ Error desconocido: " + String(error))
      }
    }
  }

  const guardarRecordatorio = async () => {
    if (!supabase) return

    try {
      setCargando(true)

      if (editando) {
        const { error } = await supabase.from("recordatorios").update(formRecordatorio).eq("id", editando)
        if (error) throw error
        mostrarMensaje("success", "✅ Recordatorio actualizado")
      } else {
        const { error } = await supabase.from("recordatorios").insert([{ ...formRecordatorio, activo: true }])
        if (error) throw error
        mostrarMensaje("success", "✅ Recordatorio creado")
      }

      setModalRecordatorio(false)
      setEditando(null)
      setFormRecordatorio({ nombre: "", monto: "", dia_mes: 1, telefono: "591", categoria: "alquiler", notas: "" })
      await cargarDatos()
    } catch (error) {
      if (error instanceof Error) {
        mostrarMensaje("error", "❌ Error de conexión: " + error.message)
      } else {
        mostrarMensaje("error", "❌ Error desconocido: " + String(error))
      }
    }
    setCargando(false)
  }

  const eliminarRecordatorio = async (id: string | number) => {
    if (!supabase) return
    try {
      const { error } = await supabase.from("recordatorios").delete().eq("id", id)
      if (error) throw error
      mostrarMensaje("success", "✅ Eliminado")
      await cargarDatos()
    } catch (error) {
      if (error instanceof Error) {
        mostrarMensaje("error", "❌ Error de conexión: " + error.message)
      } else {
        mostrarMensaje("error", "❌ Error desconocido: " + String(error))
      }
    }
  }

  const toggleRecordatorio = async (id: string | number) => {
    if (!supabase) return
    const recordatorio = recordatorios.find((r) => r.id === id)
    if (!recordatorio) return

    try {
      const { error } = await supabase.from("recordatorios").update({ activo: !recordatorio.activo }).eq("id", id)
      if (error) throw error
      await cargarDatos()
    } catch (error) {
      if (error instanceof Error) {
        mostrarMensaje("error", "❌ Error de conexión: " + error.message)
      } else {
        mostrarMensaje("error", "❌ Error desconocido: " + String(error))
      }
    }
  }

  const guardarDeuda = async () => {
    if (!supabase) return

    try {
      setCargando(true)

      if (editando) {
        const { error } = await supabase.from("deudas").update(formDeuda).eq("id", editando)
        if (error) throw error
        mostrarMensaje("success", "✅ Deuda actualizada")
      } else {
        const { error } = await supabase
          .from("deudas")
          .insert([{ ...formDeuda, activo: true, monto_pagado: 0, monto_ahorrado: 0 }])
        if (error) throw error
        mostrarMensaje("success", "✅ Deuda creada")
      }

      setModalDeuda(false)
      setEditando(null)
      setFormDeuda({ nombre: "", monto_total: "", cuota_mensual: "", tiene_interes: false, fecha_inicio: "" })
      await cargarDatos()
    } catch (error) {
      if (error instanceof Error) {
        mostrarMensaje("error", "❌ Error de conexión: " + error.message)
      } else {
        mostrarMensaje("error", "❌ Error desconocido: " + String(error))
      }
    }
    setCargando(false)
  }

  const registrarPagoDeuda = async () => {
    if (!supabase || !deudaSeleccionada || !formPagoDeuda.monto) return

    try {
      setCargando(true)

      const { error: errorPago } = await supabase.from("pagos_deudas").insert([
        {
          deuda_id: deudaSeleccionada.id,
          monto: Number.parseFloat(formPagoDeuda.monto),
          tipo: formPagoDeuda.tipo,
          notas: formPagoDeuda.notas,
          fecha: new Date().toISOString().split("T")[0],
        },
      ])

      if (errorPago) throw errorPago

      const deuda = deudas.find((d) => d.id === deudaSeleccionada.id)
      const campoActualizar = formPagoDeuda.tipo === "pago" ? "monto_pagado" : "monto_ahorrado"
      const nuevoValor =
        deuda && typeof deuda[campoActualizar] === "number"
          ? deuda[campoActualizar] + Number.parseFloat(formPagoDeuda.monto)
          : Number.parseFloat(formPagoDeuda.monto)

      const { error: errorUpdate } = await supabase
        .from("deudas")
        .update({ [campoActualizar]: nuevoValor })
        .eq("id", deudaSeleccionada.id)
      if (errorUpdate) throw errorUpdate

      if (n8nWebhookUrl) {
        try {
          await fetch(`${n8nWebhookUrl}/pago-deuda`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              deuda_id: deudaSeleccionada.id,
              deuda_nombre: deudaSeleccionada.nombre,
              monto: Number.parseFloat(formPagoDeuda.monto),
              tipo: formPagoDeuda.tipo,
              notas: formPagoDeuda.notas,
            }),
          })
        } catch (e) {
          console.log("Webhook N8N no disponible")
        }
      }

      mostrarMensaje("success", `✅ ${formPagoDeuda.tipo === "pago" ? "Pago" : "Ahorro"} registrado`)
      setModalPagoDeuda(false)
      setDeudaSeleccionada(null)
      setFormPagoDeuda({ monto: "", tipo: "pago", notas: "" })
      await cargarDatos()
    } catch (error) {
      if (error instanceof Error) {
        mostrarMensaje("error", "❌ Error de conexión: " + error.message)
      } else {
        mostrarMensaje("error", "❌ Error desconocido: " + String(error))
      }
    }
    setCargando(false)
  }

  const registrarGastoConFoto = async () => {
    if (!supabase) return

    // Si estamos editando, permitir edición manual completa
    if (editando) {
      if (!formGasto.monto) {
        mostrarMensaje("error", "❌ Completa el monto del gasto")
        return
      }

      try {
        setCargando(true)
        const { error } = await supabase
          .from("gastos")
          .update({
            monto: Number.parseFloat(formGasto.monto),
            categoria: formGasto.categoria,
            descripcion: formGasto.descripcion,
            metodo_pago: formGasto.metodo_pago,
          })
          .eq("id", editando)

        if (error) throw error
        mostrarMensaje("success", "✅ Gasto actualizado")

        setModalGasto(false)
        setFormGasto({ categoria: "alimentacion" })
        setEditando(null)
        await cargarDatos()
      } catch (error) {
        if (error instanceof Error) {
          mostrarMensaje("error", "❌ Error de conexión: " + error.message)
        } else {
          mostrarMensaje("error", "❌ Error desconocido: " + String(error))
        }
      }
      setCargando(false)
      return
    }

    // Para nuevo gasto, la imagen es obligatoria
    if (!imagenGasto) {
      mostrarMensaje("error", "❌ Debes subir una foto del comprobante")
      return
    }

    try {
      setCargando(true)

      if (n8nWebhookUrl) {
        const reader = new FileReader()
        reader.readAsDataURL(imagenGasto)
        reader.onload = async () => {
          const base64Image = reader.result

          try {
            await fetch(`${n8nWebhookUrl}/gasto-foto`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imagen: base64Image,
                categoria: formGasto.categoria,
              }),
            })

            mostrarMensaje("success", "✅ Comprobante enviado a N8N para procesamiento automático")
          } catch (e) {
            if (e instanceof Error) {
              mostrarMensaje("error", "❌ Error de conexión: " + e.message)
            } else {
              mostrarMensaje("error", "❌ Error desconocido: " + String(e))
            }
          }

          setModalGasto(false)
          setImagenGasto(null)
          setFormGasto({ categoria: "alimentacion" })
          setTimeout(() => cargarDatos(), 3000)
        }
      } else {
        mostrarMensaje("error", "❌ Configura la URL del webhook de N8N primero")
      }
    } catch (error) {
      if (error instanceof Error) {
        mostrarMensaje("error", "❌ Error de conexión: " + error.message)
      } else {
        mostrarMensaje("error", "❌ Error desconocido: " + String(error))
      }
    }
    setCargando(false)
  }

  const guardarConfiguracion = async () => {
    if (!supabase) return

    try {
      await supabase.from("configuracion").update({ valor: ingresoMensual.toString() }).eq("clave", "ingreso_mensual")
      await supabase
        .from("configuracion")
        .update({ valor: limiteGastos.toString() })
        .eq("clave", "limite_gastos_porcentaje")
      mostrarMensaje("success", "✅ Configuración guardada")
    } catch (error) {
      if (error instanceof Error) {
        mostrarMensaje("error", "❌ Error de conexión: " + error.message)
      } else {
        mostrarMensaje("error", "❌ Error desconocido: " + String(error))
      }
    }
  }

  const totalIngresos = ingresos.reduce((sum, i) => sum + Number.parseFloat(i.monto || 0), 0)
  const totalGastos = gastos.reduce((sum, g) => sum + Number.parseFloat(g.monto || 0), 0)
  const balance = totalIngresos - totalGastos
  const porcentajeGastado = totalIngresos > 0 ? ((totalGastos / totalIngresos) * 100).toFixed(1) : 0
  const coloresCategoria = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"]

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">💰 Panel de Control Financiero</h1>
              <p className="text-gray-600">Santa Cruz de la Sierra, Bolivia 🇧🇴</p>
            </div>
            {conectado && (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setVista("dashboard")}
                  className={`px-4 py-2 rounded-lg transition ${vista === "dashboard" ? "bg-indigo-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setVista("ingresos")}
                  className={`px-4 py-2 rounded-lg transition ${vista === "ingresos" ? "bg-indigo-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
                >
                  Ingresos
                </button>
                <button
                  onClick={() => setVista("recordatorios")}
                  className={`px-4 py-2 rounded-lg transition ${vista === "recordatorios" ? "bg-indigo-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
                >
                  Recordatorios
                </button>
                <button
                  onClick={() => setVista("gastos")}
                  className={`px-4 py-2 rounded-lg transition ${vista === "gastos" ? "bg-indigo-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
                >
                  Gastos
                </button>
                <button
                  onClick={() => setVista("deudas")}
                  className={`px-4 py-2 rounded-lg transition ${vista === "deudas" ? "bg-indigo-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
                >
                  Deudas
                </button>
                <button
                  onClick={() => setVista("config")}
                  className={`px-4 py-2 rounded-lg transition ${vista === "config" ? "bg-indigo-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
                >
                  Config
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mensajes */}
      {mensaje.texto && (
        <div
          className={`max-w-7xl mx-auto mb-4 p-4 rounded-lg shadow ${mensaje.tipo === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
        >
          {mensaje.texto}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Configuración */}
        {!conectado && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">🔐 Configuración Inicial</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Supabase URL</label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xxxxx.supabase.co"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Supabase API Key (anon/public)</label>
                <input
                  type="password"
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">N8N Webhook URL (opcional)</label>
                <input
                  type="text"
                  value={n8nWebhookUrl}
                  onChange={(e) => setN8nWebhookUrl(e.target.value)}
                  placeholder="https://tu-n8n.com/webhook"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Para OCR de comprobantes y automatizaciones</p>
              </div>
              <button
                onClick={conectarSupabase}
                disabled={cargando}
                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-semibold"
              >
                {cargando ? "⏳ Conectando..." : "🔌 Conectar a Supabase"}
              </button>
            </div>
          </div>
        )}

        {/* Dashboard */}
        {vista === "dashboard" && conectado && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-8 h-8" />
                <h3 className="text-lg font-semibold">Ingresos del Mes</h3>
              </div>
              <p className="text-4xl font-bold">Bs {totalIngresos.toLocaleString()}</p>
              <p className="text-sm opacity-90">{ingresos.length} ingreso(s) registrado(s)</p>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <TrendingDown className="w-8 h-8" />
                <h3 className="text-lg font-semibold">Gastos del Mes</h3>
              </div>
              <p className="text-4xl font-bold">Bs {totalGastos.toFixed(2)}</p>
              <p className="text-sm opacity-90">{porcentajeGastado}% de ingresos</p>
            </div>

            <div
              className={`bg-gradient-to-br ${balance >= 0 ? "from-blue-500 to-blue-600" : "from-orange-500 to-orange-600"} rounded-xl shadow-lg p-6 text-white`}
            >
              <div className="flex items-center gap-3 mb-2">
                <CreditCard className="w-8 h-8" />
                <h3 className="text-lg font-semibold">Balance</h3>
              </div>
              <p className="text-4xl font-bold">Bs {balance.toFixed(2)}</p>
              <p className="text-sm opacity-90">{balance >= 0 ? "Superávit" : "Déficit"}</p>
            </div>

            <div className="md:col-span-2 bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4">📊 Distribución de Gastos</h3>
              {gastos.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={gastos} dataKey="monto" nameKey="categoria" cx="50%" cy="50%" outerRadius={100} label>
                      {gastos.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={coloresCategoria[index % coloresCategoria.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `Bs ${Number(value).toFixed(2)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-20">No hay gastos registrados este mes</p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4">🔔 Recordatorios Activos</h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {recordatorios.filter((r) => r.activo).length > 0 ? (
                  recordatorios
                    .filter((r) => r.activo)
                    .map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                        <div>
                          <p className="font-semibold">{r.nombre}</p>
                          <p className="text-sm text-gray-600">
                            Día {r.dia_mes} - Bs {r.monto}
                          </p>
                        </div>
                        <Bell className="w-5 h-5 text-indigo-600" />
                      </div>
                    ))
                ) : (
                  <p className="text-center text-gray-500 py-4">Sin recordatorios activos</p>
                )}
              </div>
            </div>
          </div>
        )}

        {vista === "ingresos" && conectado && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">💵 Mis Ingresos</h2>
                <p className="text-gray-600">Total del mes: Bs {totalIngresos.toFixed(2)}</p>
              </div>
              <button
                onClick={() => setModalIngreso(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition"
              >
                <Plus className="w-5 h-5" /> Nuevo Ingreso
              </button>
            </div>

            <div className="grid gap-4">
              {ingresos.length > 0 ? (
                ingresos.map((i) => (
                  <div key={i.id} className="p-4 rounded-lg border-2 border-green-200 bg-green-50">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-xl text-green-700">
                            Bs {Number.parseFloat(i.monto).toFixed(2)}
                          </h3>
                          <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm font-medium">
                            {i.fuente}
                          </span>
                        </div>
                        {i.descripcion && <p className="text-gray-700 mt-1">{i.descripcion}</p>}
                        <p className="text-sm text-gray-500 mt-1">📅 {new Date(i.fecha).toLocaleDateString("es-BO")}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditando(i.id)
                            setFormIngreso(i)
                            setModalIngreso(true)
                          }}
                          className="p-2 bg-blue-100 rounded hover:bg-blue-200 transition"
                        >
                          <Edit className="w-5 h-5 text-blue-600" />
                        </button>
                        <button
                          onClick={() => eliminarIngreso(i.id)}
                          className="p-2 bg-red-100 rounded hover:bg-red-200 transition"
                        >
                          <Trash2 className="w-5 h-5 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20">
                  <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No hay ingresos registrados este mes</p>
                  <p className="text-gray-400 text-sm">Comienza registrando tu primer ingreso</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recordatorios */}
        {vista === "recordatorios" && conectado && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">📋 Mis Recordatorios</h2>
              <button
                onClick={() => setModalRecordatorio(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition"
              >
                <Plus className="w-5 h-5" /> Nuevo
              </button>
            </div>

            <div className="grid gap-4">
              {recordatorios.length > 0 ? (
                recordatorios.map((r) => (
                  <div
                    key={r.id}
                    className={`p-4 rounded-lg border-2 transition ${r.activo ? "border-green-300 bg-green-50" : "border-gray-300 bg-gray-50"}`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{r.nombre}</h3>
                        <p className="text-gray-600">
                          Bs {r.monto} - Día {r.dia_mes} de cada mes
                        </p>
                        <p className="text-sm text-gray-500">
                          {r.categoria} • {r.telefono}
                        </p>
                        {r.notas && <p className="text-sm text-gray-600 mt-1">📝 {r.notas}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleRecordatorio(r.id)}
                          className={`px-3 py-1 rounded transition ${r.activo ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-400 text-white hover:bg-gray-500"}`}
                        >
                          {r.activo ? "Activo" : "Inactivo"}
                        </button>
                        <button
                          onClick={() => {
                            setEditando(r.id)
                            setFormRecordatorio(r)
                            setModalRecordatorio(true)
                          }}
                          className="p-2 bg-blue-100 rounded hover:bg-blue-200 transition"
                        >
                          <Edit className="w-5 h-5 text-blue-600" />
                        </button>
                        <button
                          onClick={() => eliminarRecordatorio(r.id)}
                          className="p-2 bg-red-100 rounded hover:bg-red-200 transition"
                        >
                          <Trash2 className="w-5 h-5 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-10">No hay recordatorios. Crea uno nuevo.</p>
              )}
            </div>
          </div>
        )}

        {vista === "gastos" && conectado && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">💳 Mis Gastos</h2>
                <p className="text-gray-600">Total del mes: Bs {totalGastos.toFixed(2)}</p>
              </div>
              <button
                onClick={() => {
                  setEditando(null)
                  setFormGasto({ categoria: "alimentacion" })
                  setImagenGasto(null) // Reset image when opening for new entry
                  setModalGasto(true)
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition"
              >
                <Plus className="w-5 h-5" /> Nuevo Gasto
              </button>
            </div>

            <div className="grid gap-4">
              {gastosDetallados.length > 0 ? (
                gastosDetallados.map((g) => (
                  <div key={g.id} className="p-4 rounded-lg border-2 border-red-200 bg-red-50">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-bold text-xl text-red-700">Bs {Number.parseFloat(g.monto).toFixed(2)}</h3>
                          <span className="px-3 py-1 bg-red-200 text-red-800 rounded-full text-sm font-medium">
                            {g.categoria}
                          </span>
                          <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm">
                            {g.metodo_pago}
                          </span>
                        </div>
                        {g.descripcion && <p className="text-gray-700 mt-2">{g.descripcion}</p>}
                        <p className="text-sm text-gray-500 mt-1">
                          📅 {new Date(g.fecha).toLocaleDateString("es-BO")}
                          {g.hora && ` • 🕐 ${g.hora}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => editarGasto(g)}
                          className="p-2 bg-blue-100 rounded hover:bg-blue-200 transition"
                        >
                          <Edit className="w-5 h-5 text-blue-600" />
                        </button>
                        <button
                          onClick={() => eliminarGasto(g.id)}
                          className="p-2 bg-red-100 rounded hover:bg-red-200 transition"
                        >
                          <Trash2 className="w-5 h-5 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20">
                  <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No hay gastos registrados este mes</p>
                  <p className="text-gray-400 text-sm">Comienza registrando tu primer gasto</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Deudas y Ahorros */}
        {vista === "deudas" && conectado && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">💳 Seguimiento de Deudas y Ahorros</h2>
                <button
                  onClick={() => setModalDeuda(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Nueva Deuda
                </button>
              </div>

              <div className="grid gap-6">
                {deudas.map((d) => {
                  const saldoPendiente = d.monto_total - d.monto_pagado
                  const porcentajePagado = ((d.monto_pagado / d.monto_total) * 100).toFixed(1)
                  const porcentajeAhorrado =
                    saldoPendiente > 0 ? ((d.monto_ahorrado / saldoPendiente) * 100).toFixed(1) : 0
                  const puedePagarContado = d.monto_ahorrado >= saldoPendiente

                  return (
                    <div
                      key={d.id}
                      className="border-2 border-indigo-200 rounded-xl p-6 bg-gradient-to-br from-indigo-50 to-purple-50"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-800">{d.nombre}</h3>
                          <p className="text-gray-600">Monto Total: Bs {d.monto_total}</p>
                        </div>
                        {puedePagarContado && (
                          <div className="bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" />
                            ¡Puedes pagar al contado!
                          </div>
                        )}
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-white rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-1">💰 Monto Pagado</p>
                          <p className="text-2xl font-bold text-green-600">Bs {d.monto_pagado}</p>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${porcentajePagado}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{porcentajePagado}% pagado</p>
                        </div>

                        <div className="bg-white rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-1">🏦 Ahorrado para Pago</p>
                          <p className="text-2xl font-bold text-blue-600">Bs {d.monto_ahorrado}</p>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${porcentajeAhorrado}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{porcentajeAhorrado}% del saldo</p>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <p className="font-semibold">Saldo Pendiente</p>
                          <p className="text-2xl font-bold text-red-600">Bs {saldoPendiente.toFixed(2)}</p>
                        </div>
                        <p className="text-sm text-gray-600">
                          Falta ahorrar: Bs {(saldoPendiente - d.monto_ahorrado).toFixed(2)}
                        </p>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => {
                            setEditando(d.id)
                            setFormDeuda({
                              nombre: d.nombre ?? "",
                              monto_total: d.monto_total !== undefined ? d.monto_total.toString() : "",
                              cuota_mensual: d.cuota_mensual !== undefined ? d.cuota_mensual.toString() : "",
                              tiene_interes: !!d.tiene_interes,
                              fecha_inicio: d.fecha_inicio ?? "",
                            })
                            setModalDeuda(true)
                          }}
                          className="flex-1 bg-blue-100 text-blue-600 px-4 py-2 rounded-lg flex items-center justify-center gap-2"
                        >
                          <Edit className="w-4 h-4" /> Editar
                        </button>
                        <button
                          onClick={() => {
                            setDeudaSeleccionada(d)
                            setFormPagoDeuda({ ...formPagoDeuda, tipo: "pago" })
                            setModalPagoDeuda(true)
                          }}
                          className="flex-1 bg-green-100 text-green-600 px-4 py-2 rounded-lg"
                        >
                          Registrar Pago
                        </button>
                        <button
                          onClick={() => {
                            setDeudaSeleccionada(d)
                            setFormPagoDeuda({ ...formPagoDeuda, tipo: "ahorro" })
                            setModalPagoDeuda(true)
                          }}
                          className="flex-1 bg-purple-100 text-purple-600 px-4 py-2 rounded-lg"
                        >
                          Agregar Ahorro
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {modalGasto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{editando ? "Editar" : "Registrar"} Gasto</h3>
              <button
                onClick={() => {
                  setModalGasto(false)
                  setEditando(null)
                  setImagenGasto(null)
                  setFormGasto({ categoria: "alimentacion" })
                }}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {editando ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Monto (Bs)</label>
                    <input
                      type="number"
                      value={formGasto.monto}
                      onChange={(e) => setFormGasto({ ...formGasto, monto: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="150.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Categoría</label>
                    <select
                      value={formGasto.categoria}
                      onChange={(e) => setFormGasto({ ...formGasto, categoria: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="alimentacion">🍔 Alimentación</option>
                      <option value="transporte">🚗 Transporte</option>
                      <option value="entretenimiento">🎮 Entretenimiento</option>
                      <option value="salud">💊 Salud</option>
                      <option value="educacion">📚 Educación</option>
                      <option value="servicios">💡 Servicios</option>
                      <option value="ropa">👕 Ropa</option>
                      <option value="otro">📦 Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Método de Pago</label>
                    <select
                      value={formGasto.metodo_pago}
                      onChange={(e) => setFormGasto({ ...formGasto, metodo_pago: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="efectivo">💵 Efectivo</option>
                      <option value="tarjeta">💳 Tarjeta</option>
                      <option value="transferencia">🏦 Transferencia</option>
                      <option value="qr">📱 QR</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Descripción</label>
                    <textarea
                      value={formGasto.descripcion}
                      onChange={(e) => setFormGasto({ ...formGasto, descripcion: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={2}
                      placeholder="Ej: Almuerzo en restaurante"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 font-medium mb-2">📸 Flujo Automático con N8N</p>
                    <p className="text-xs text-blue-600">
                      Sube el comprobante y selecciona la categoría. N8N extraerá automáticamente el monto, fecha y
                      descripción mediante OCR.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Foto del Comprobante <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImagenGasto(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                      className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 transition"
                    />
                    {imagenGasto && (
                      <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Imagen seleccionada: {imagenGasto.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Categoría del Gasto</label>
                    <select
                      value={formGasto.categoria}
                      onChange={(e) => setFormGasto({ ...formGasto, categoria: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="alimentacion">🍔 Alimentación</option>
                      <option value="transporte">🚗 Transporte</option>
                      <option value="entretenimiento">🎮 Entretenimiento</option>
                      <option value="salud">💊 Salud</option>
                      <option value="educacion">📚 Educación</option>
                      <option value="servicios">💡 Servicios</option>
                      <option value="ropa">👕 Ropa</option>
                      <option value="otro">📦 Otro</option>
                    </select>
                  </div>
                </>
              )}

              <button
                onClick={registrarGastoConFoto}
                disabled={cargando || (!editando && !imagenGasto)}
                className="w-full bg-red-600 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Save className="w-5 h-5" />
                {editando ? "Actualizar Gasto" : "Enviar a N8N"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalIngreso && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{editando ? "Editar" : "Nuevo"} Ingreso</h3>
              <button
                onClick={() => {
                  setModalIngreso(false)
                  setEditando(null)
                }}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Monto (Bs)</label>
                <input
                  type="number"
                  value={formIngreso.monto}
                  onChange={(e) => setFormIngreso({ ...formIngreso, monto: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="1500.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Categoría</label>
                <select
                  value={formIngreso.categoria}
                  onChange={(e) => setFormIngreso({ ...formIngreso, categoria: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="salario">💼 Salario</option>
                  <option value="freelance">💻 Freelance</option>
                  <option value="bono">🎁 Bono</option>
                  <option value="venta">🛒 Venta</option>
                  <option value="inversion">📈 Inversión</option>
                  <option value="regalo">🎉 Regalo</option>
                  <option value="otro">📦 Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fecha</label>
                <input
                  type="date"
                  value={formIngreso.fecha}
                  onChange={(e) => setFormIngreso({ ...formIngreso, fecha: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descripción (opcional)</label>
                <textarea
                  value={formIngreso.descripcion}
                  onChange={(e) => setFormIngreso({ ...formIngreso, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                  placeholder="Ej: Pago quincenal, proyecto web, etc."
                />
              </div>

              <button
                onClick={guardarIngreso}
                disabled={cargando}
                className="w-full bg-green-600 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {editando ? "Actualizar" : "Registrar"} Ingreso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Recordatorio */}
      {modalRecordatorio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{editando ? "Editar" : "Nuevo"} Recordatorio</h3>
              <button
                onClick={() => {
                  setModalRecordatorio(false)
                  setEditando(null)
                }}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input
                  type="text"
                  value={formRecordatorio.nombre}
                  onChange={(e) => setFormRecordatorio({ ...formRecordatorio, nombre: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ej: Alquiler Casa"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Monto (Bs)</label>
                  <input
                    type="number"
                    value={formRecordatorio.monto}
                    onChange={(e) => setFormRecordatorio({ ...formRecordatorio, monto: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Día del Mes</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formRecordatorio.dia_mes}
                    onChange={(e) => setFormRecordatorio({ ...formRecordatorio, dia_mes: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Categoría</label>
                <select
                  value={formRecordatorio.categoria}
                  onChange={(e) => setFormRecordatorio({ ...formRecordatorio, categoria: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="alquiler">Alquiler</option>
                  <option value="deuda">Deuda</option>
                  <option value="prestamo">Préstamo</option>
                  <option value="servicio">Servicio</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Teléfono WhatsApp</label>
                <input
                  type="text"
                  value={formRecordatorio.telefono}
                  onChange={(e) => setFormRecordatorio({ ...formRecordatorio, telefono: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="591XXXXXXXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notas (opcional)</label>
                <textarea
                  value={formRecordatorio.notas}
                  onChange={(e) => setFormRecordatorio({ ...formRecordatorio, notas: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>

              <button
                onClick={guardarRecordatorio}
                className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {editando ? "Actualizar" : "Crear"} Recordatorio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Deuda */}
      {modalDeuda && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{editando ? "Editar" : "Nueva"} Deuda</h3>
              <button
                onClick={() => {
                  setModalDeuda(false)
                  setEditando(null)
                }}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre de la Deuda</label>
                <input
                  type="text"
                  value={formDeuda.nombre}
                  onChange={(e) => setFormDeuda({ ...formDeuda, nombre: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ej: Préstamo Banco"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Monto Total (Bs)</label>
                  <input
                    type="number"
                    value={formDeuda.monto_total}
                    onChange={(e) => setFormDeuda({ ...formDeuda, monto_total: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Cuota Mensual (Bs)</label>
                  <input
                    type="number"
                    value={formDeuda.cuota_mensual}
                    onChange={(e) => setFormDeuda({ ...formDeuda, cuota_mensual: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fecha de Inicio</label>
                <input
                  type="date"
                  value={formDeuda.fecha_inicio}
                  onChange={(e) => setFormDeuda({ ...formDeuda, fecha_inicio: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formDeuda.tiene_interes}
                  onChange={(e) => setFormDeuda({ ...formDeuda, tiene_interes: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm font-medium">¿Tiene intereses?</label>
              </div>

              <button
                onClick={guardarDeuda}
                className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {editando ? "Actualizar" : "Crear"} Deuda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pago Deuda */}
      {modalPagoDeuda && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {formPagoDeuda.tipo === "pago" ? "💰 Registrar Pago" : "🏦 Agregar Ahorro"}
              </h3>
              <button
                onClick={() => {
                  setModalPagoDeuda(false)
                  setDeudaSeleccionada(null)
                }}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {deudaSeleccionada && (
              <div className="bg-indigo-50 p-3 rounded-lg mb-4">
                <p className="font-semibold">{deudaSeleccionada.nombre}</p>
                <p className="text-sm text-gray-600">
                  Saldo: Bs {(deudaSeleccionada.monto_total - deudaSeleccionada.monto_pagado).toFixed(2)}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Monto (Bs)</label>
                <input
                  type="number"
                  value={formPagoDeuda.monto}
                  onChange={(e) => setFormPagoDeuda({ ...formPagoDeuda, monto: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="500.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notas (opcional)</label>
                <textarea
                  value={formPagoDeuda.notas}
                  onChange={(e) => setFormPagoDeuda({ ...formPagoDeuda, notas: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                  placeholder="Ej: Pago mensual de enero"
                />
              </div>

              <button
                onClick={registrarPagoDeuda}
                disabled={cargando}
                className={`w-full px-4 py-3 rounded-lg flex items-center justify-center gap-2 text-white ${formPagoDeuda.tipo === "pago" ? "bg-green-600 hover:bg-green-700" : "bg-purple-600 hover:bg-purple-700"} disabled:opacity-50`}
              >
                <Save className="w-5 h-5" />
                {formPagoDeuda.tipo === "pago" ? "Registrar Pago" : "Agregar Ahorro"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configuración General */}
      {vista === "config" && conectado && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6">⚙️ Configuración General</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Ingreso Mensual Presupuestado (Bs)</label>
              <input
                type="number"
                value={ingresoMensual}
                onChange={(e) => setIngresoMensual(Number.parseFloat(e.target.value))}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Este es tu ingreso esperado. Los ingresos reales se registran en la sección "Ingresos".
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Límite de Gastos (%)</label>
              <input
                type="number"
                value={limiteGastos}
                onChange={(e) => setLimiteGastos(Number.parseFloat(e.target.value))}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <p className="text-sm text-gray-600 mt-1">
                Bs {((ingresoMensual * limiteGastos) / 100).toFixed(2)} máximo
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">📡 Webhooks de N8N</h3>
              <p className="text-sm text-gray-600 mb-3">Configura estos webhooks en N8N:</p>
              <div className="space-y-2 text-sm">
                <div className="bg-white p-2 rounded">
                  <strong>Registro de Gastos:</strong> /webhook/registrar-gasto-foto
                </div>
                <div className="bg-white p-2 rounded">
                  <strong>Pago de Deudas:</strong> /webhook/registrar-pago-deuda
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">✅ Evolution API</h3>
              <p className="text-sm text-gray-600">Configurado para enviar notificaciones por WhatsApp</p>
            </div>

            <button
              onClick={guardarConfiguracion}
              className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
            >
              💾 Guardar Configuración
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
