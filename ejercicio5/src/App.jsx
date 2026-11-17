import ReservaForm from './components/ReservaForm.jsx';
import ReservasList from './components/ReservasList.jsx';

export default function App() {
  return (
    <>
      <header className="cabecera">
        <h1>Cenas del Pasaporte</h1>
        <p>Un país distinto cada noche. Reserva tu mesa y suma un sello más a tu pasaporte gastronómico.</p>
      </header>
      <main className="contenido">
        <ReservaForm />
        <ReservasList />
      </main>
    </>
  );
}
