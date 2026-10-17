import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="wrap section empty">
      <h1>Esta página no existe</h1>
      <p>Puede que el enlace esté incompleto.</p>
      <Link className="btn" to="/biblioteca">
        Ir a la biblioteca
      </Link>
    </div>
  );
}
