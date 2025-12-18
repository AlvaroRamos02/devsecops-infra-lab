import styles from './Contact.module.css';

export default function Contact() {
    return (
        <section id="contacto" className={styles.section}>
            <div className={styles.container}>
                <h2 className={`${styles.title} text-gradient`}>Contáctanos</h2>
                <p className={styles.subtitle}>¿Tienes alguna duda o quieres pedir cita? Escríbenos.</p>

                <form className={`${styles.form} glass`}>
                    <div className={styles.group}>
                        <label htmlFor="name" className={styles.label}>Nombre</label>
                        <input type="text" id="name" className={styles.input} placeholder="Tu nombre" required />
                    </div>

                    <div className={styles.group}>
                        <label htmlFor="phone" className={styles.label}>Teléfono</label>
                        <input type="tel" id="phone" className={styles.input} placeholder="600 000 000" required />
                    </div>

                    <div className={styles.group}>
                        <label htmlFor="device" className={styles.label}>Dispositivo</label>
                        <input type="text" id="device" className={styles.input} placeholder="Ej: iPhone 13, Portátil HP..." />
                    </div>

                    <div className={styles.group}>
                        <label htmlFor="message" className={styles.label}>Mensaje</label>
                        <textarea id="message" className={styles.textarea} placeholder="Describe brevemente el problema..." required></textarea>
                    </div>

                    <button type="submit" className="btn-primary">Enviar Consulta</button>
                </form>
            </div>
        </section>
    );
}
