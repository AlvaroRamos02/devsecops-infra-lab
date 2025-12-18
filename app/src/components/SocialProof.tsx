import styles from './SocialProof.module.css';

export default function SocialProof() {
    return (
        <section id="nosotros" className={styles.section}>
            <div className="container">
                <div className={`${styles.box} glass`}>
                    <div className={styles.stat}>
                        <span className={styles.number}>4.9</span>
                        <span className={styles.label}>Estrellas en Google</span>
                    </div>
                    <div className={styles.divider}></div>
                    <div className={styles.stat}>
                        <span className={styles.number}>+360</span>
                        <span className={styles.label}>Clientes Satisfechos</span>
                    </div>
                    <div className={styles.divider}></div>
                    <div className={styles.stat}>
                        <span className={styles.number}>100%</span>
                        <span className={styles.label}>Garantía</span>
                    </div>
                </div>
                <p className={styles.quote}>
                    "El mejor servicio técnico de Boadilla. Rápidos, profesionales y honestos."
                </p>
            </div>
        </section>
    );
}
