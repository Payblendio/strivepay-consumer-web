import Image from "next/image";
import styles from "./recovery.module.css";

export default function DashboardLoading(){
  return (
    <section className={styles.boot} role="status" aria-busy="true" aria-label="Loading dashboard">
      <div className={styles.bootMark}>
        <span className={styles.bootRing} aria-hidden="true"/>
        <Image
          className={styles.bootIcon}
          src="/branding/strivepay-mark.svg"
          alt=""
          width={48}
          height={64}
          priority
        />
      </div>
      <p className={styles.bootLabel}>Loading your dashboard</p>
    </section>
  );
}
