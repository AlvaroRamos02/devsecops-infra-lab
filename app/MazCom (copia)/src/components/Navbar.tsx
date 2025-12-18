import Link from 'next/link';
import styles from './Navbar.module.css';

export default function Navbar() {
    return (
        <nav className={`${styles.navbar} glass-nav`}>
            <div className={`container ${styles.container}`}>
                <Link href="/" className={styles.logo}>
                    Maz<span className="text-gradient">Com</span>
                </Link>

                <div className={styles.links}>
                    <Link href="#servicios">Servicios</Link>
                    <Link href="#nosotros">Nosotros</Link>
                    <Link href="#contacto">Contacto</Link>
                </div>

                <a
                    href="https://wa.me/34630488150"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                >
                    Pedir Cita
                </a>
            </div>
        </nav>
    );
}
