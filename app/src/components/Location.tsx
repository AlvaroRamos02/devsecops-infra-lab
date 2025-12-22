import styles from './Location.module.css';

export default function Location() {
    return (
        <section id="contacto" className="section-padding">
            <div className="container">
                <div className={`${styles.wrapper} glass`}>
                    <div className={styles.info}>
                        <h2 className={styles.heading}>Visítanos</h2>
                        <address className={styles.address}>
                            <p><strong>MazCom</strong></p>
                            <p>Av. Infante Don Luis, 18</p>
                            <p>Boadilla del Monte, Madrid</p>
                            <p className={styles.badge}>♿ Acceso para sillas de ruedas</p>
                        </address>
                        <div className={styles.hours}>
                            <p>Lunes a Viernes: 10:00 - 14:00 | 17:00 - 20:30</p>
                            <p>Sábados: 10:00 - 14:00</p>
                        </div>
                        <a
                            href="https://wa.me/34630488150"
                            className="btn-primary"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Contactar por WhatsApp
                        </a>
                    </div>
                    <div className={styles.map}>
                        {/* Placeholder for map iframe or image */}
                        <div className={styles.mapPlaceholder}>
                            <span>Mapa de Ubicación</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
