import styles from './Hero.module.css';

export default function Hero() {
    return (
        <section className={styles.hero}>
            <div className={styles.glow}></div>
            <div className={`container ${styles.content}`}>
                <h1 className={`${styles.title} animate-fade-in`}>
                    Damos una <span className="text-gradient">segunda vida</span> a tus dispositivos
                </h1>
                <p className={styles.subtitle}>
                    Reparación experta de móviles, tablets y ordenadores en Boadilla del Monte.
                    Calidad, rapidez y garantía.
                </p>
                <div className={styles.actions}>
                    <a
                        href="https://wa.me/34630488150"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary"
                    >
                        Consultar por WhatsApp
                    </a>
                    <a href="#servicios" className={styles.secondaryBtn}>
                        Ver Servicios
                    </a>
                </div>
            </div>
        </section>
    );
}
