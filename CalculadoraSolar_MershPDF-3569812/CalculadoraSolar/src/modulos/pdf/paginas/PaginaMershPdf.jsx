import BarraNavegacion from '../../../core/navegacion/BarraNavegacion';
import MershPdfWorkspace from '../componentes/MershPdfWorkspace';
import '../../cotizacion/estilos/propuesta.css';
import '../estilos/mershPDF.css';

export default function PaginaMershPdf() {
  return (
    <>
      <BarraNavegacion />
      <MershPdfWorkspace />
    </>
  );
}
