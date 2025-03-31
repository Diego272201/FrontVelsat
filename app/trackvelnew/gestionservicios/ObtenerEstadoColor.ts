export const getEstadoYColorVerifica = (item: any) => {
    if (!item.horaProg) return { estado: "ERROR", color: "#C9CECD" };
    
    if (item.estado === "C") return { estado: "CN", color: "#E5AFEF" };
  
    let estado = "AS";
    let color = "#AFD5EF";
  
    if (!item.unidad) {
      estado = "NA";
      color = "#FDBDAA";
    }
  
    return { estado, color };
  };


  const parseFecha = (fechaStr: string | null) => {
    if (!fechaStr) return null;
    const [dia, mes, añoHora] = fechaStr.split('/');
    const [año, hora] = añoHora.split(' ');
    return new Date(`${año}-${mes}-${dia}T${hora}:00`).getTime();
  };
  
  export const getEstadoYColor = (item: any) => {
    const fechaActual = new Date().getTime();
    const fechaProg = parseFecha(item.fecplan);
    const fechaInicio = parseFecha(item.newfechaini);
    const fechaFin = parseFecha(item.newfechafni);
    const fechaATO = parseFecha(item.fecha);
  
    if (!fechaProg) return { estado: 'ERROR', color: '#C9CECD' };
  
    if (item.estado === 'C') return { estado: 'CN', color: '#E5AFEF' };
  
    let estado = 'AS';
    let color = '#AFD5EF';
  
    if (!item.unidad?.codunidad) {
      estado = 'NA';
      color = '#FDBDAA';
    } else {
      // 🚨 Verificamos si ya pasó la fecha programada pero no ha iniciado
      if (fechaActual > fechaProg && !fechaInicio) {
        estado = 'NI';
        color = '#868887';
      }
  
      // Si el servicio ha finalizado
      if (fechaFin && fechaATO) {
        const diferenciaFin = fechaFin - fechaATO;
        if (item.tipo === 'I') {
          estado = diferenciaFin > 60000 ? 'FT' : 'FA';
          color = diferenciaFin > 60000 ? '#FAFAAD' : '#CFFBAC';
        } else {
          estado = 'FA';
          color = '#CFFBAC';
        }
      }
  
      // Si el servicio está en proceso
      if (fechaInicio && !fechaFin) {
        if (fechaATO) {
          const diferencia = fechaActual - fechaATO;
          if (item.tipo === 'I' || item.tipo === 'S') {
            estado = diferencia < 7200000 ? 'PR' : 'PR';
            color = '#EBF9F8';
          }
        }
      }
    }
  
    return { estado, color };
  };