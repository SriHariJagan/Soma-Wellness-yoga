import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { FAQ_ITEMS } from "../../config/siteContent.js";
import { EASE } from "../../lib/motion.js";
import { useTranslation } from "react-i18next";

export const SW_FAQ_MAP = {
  "What is SomaWellness?": { q: "SomaWellness ni nini?", a: "SomaWellness ni chapa ya kimataifa ya ustawi wa hali ya juu iliyoundwa kusaidia afya ya mwili, ustawi wa akili, uponyaji na maisha yenye usawa zaidi. Tunakusanya mwendo wa umakini, tiba ya uponyaji, umakini, kupumua, masaji na mazoea ya maisha ya fahamu katika mazingira tulivu na ya kukaribisha." },
  "Where are you located?": { q: "Mpo wapi?", a: "SomaWellness iko Spring Valley, Nairobi, Kenya. Kituo kimebuniwa kama nafasi tulivu ya ustawi, huku kikiwa rahisi kufikiwa ndani ya Nairobi. Anwani Kamili: Spring Valley, Nairobi, Kenya." },
  "What experiences are available at SomaWellness?": { q: "Ni uzoefu gani unaopatikana SomaWellness?", a: "SomaWellness inatoa: Vipindi vya Ustawi vya Kikundi, Programu Binafsi za Ana kwa Ana, Tiba ya Uponyaji, Umakini, Kupumua, Usimamizi wa Msongo, Masaji, Programu za Ujauzito na Baada ya Kujifungua, Programu za Watoto, Programu Rafiki kwa Wazee, Ustawi wa Mashirika, Ushauri wa Ustawi, Safari Maalum na Mafunzo ya Wataalamu." },
  "Is SomaWellness only for experienced practitioners?": { q: "Je, SomaWellness ni kwa wataalamu wenye uzoefu tu?", a: "Hapana. SomaWellness ni kwa yeyote anayependa ustawi wa jumla — umakini, usimamizi wa msongo, uponyaji, masaji, kupumua na msaada wa mtindo wa maisha. Hakuna uzoefu wa awali unaohitajika." },
  "What makes SomaWellness different from a regular gym, studio or spa?": { q: "Nini kinachofanya SomaWellness kuwa tofauti na gym, studio au spa ya kawaida?", a: "SomaWellness ni kituo jumuishi cha ustawi — tunakusanya mwendo, pumzi, umakini, uponyaji, elimu na mtindo wa maisha chini ya falsafa moja ya ustawi." },
  "Do I need yoga experience to join?": { q: "Je, nahitaji uzoefu wa yoga kujiunga?", a: "Hapana kabisa. Wanaoanza wanakaribishwa. Huhitaji uzoefu — yoga hujenga nguvu na uelewa hatua kwa hatua." },
  "What is Yoga Therapy?": { q: "Tiba ya Yoga ni nini?", a: "Tiba ya yoga ni matumizi ya kibinafsi ya mazoea ya yoga — mwendo, pumzi na utulivu — kulingana na mahitaji yako. Inakamilisha matibabu ya daktari." },
  "What is the difference between Yoga and Yoga Therapy?": { q: "Kuna tofauti gani kati ya Yoga na Tiba ya Yoga?", a: "Kipindi cha yoga hufuata mpangilio unaofaa wote. Tiba ya yoga ni ya kibinafsi — tunatengeneza programu inayokufaa wewe binafsi." },
  "Do I need a therapy assessment before starting Yoga Therapy?": { q: "Je, nahitaji tathmini kabla ya kuanza Tiba ya Yoga?", a: "Ndiyo. Tiba huanza na tathmini ya dakika 75 (KES 6,500) ili tuweze kupendekeza programu inayofaa." },
  "Is Private Yoga available?": { q: "Je, Yoga Binafsi inapatikana?", a: "Ndiyo. Tunatoa vipindi vya yoga binafsi vya ana kwa ana — kwa wanaoanza, wenye shughuli nyingi, wazee, na wale wanaopendelea faragha." },
  "Do you offer mindfulness and breathing sessions?": { q: "Je, mnatoa vipindi vya umakini na kupumua?", a: "Ndiyo. Umakini na kupumua kwa fahamu ni sehemu muhimu ya SomaWellness — umakini wa kuongozwa, kutafakari, na mazoea ya kupumzika." },
  "Do you offer Prenatal Yoga and Postnatal Yoga?": { q: "Je, mnatoa Yoga ya Wajawazito na Yoga Baada ya Kujifungua?", a: "Ndiyo. Tunatoa programu maalum za yoga ya wajawazito na baada ya kujifungua — mwendo laini, kupumua, na kupumzika." },
  "Is Children's Yoga available?": { q: "Je, Yoga ya Watoto inapatikana?", a: "Ndiyo. Programu zetu za yoga ya watoto huanzisha mwendo na umakini kwa njia inayofaa umri." },
  "Do you have programs for seniors?": { q: "Je, mna programu kwa wazee?", a: "Ndiyo. Programu zetu hubadilika kwa umri na uhamaji — mwendo laini, msaada wa kiti, usawa, kupumua na kupumzika." },
  "Do you provide massage and restorative therapies?": { q: "Je, mnatoa masaji na tiba za uponyaji?", a: "Ndiyo. Masaji na tiba za utulivu ni sehemu ya mbinu yetu jumuishi — weka nafasi kibinafsi au changanya na vipindi na matambiko." },
  "Can I combine sessions, massage and mindfulness in one package?": { q: "Je, naweza kuchanganya vipindi, masaji na umakini kwenye kifurushi kimoja?", a: "Ndiyo — hii ni dhana ya msingi ya SomaWellness. Chagua safari jumuishi zinazochanganya vipindi, umakini, masaji na kupumzika." },
  "Do you offer corporate wellness programs?": { q: "Je, mnatoa programu za ustawi wa mashirika?", a: "Ndiyo. SomaWellness inatoa ustawi mahali pa kazi kwa kampuni na mashirika — vipindi vya ofisini, warsha, na vifurushi maalum." },
  "Do you offer Yoga Teacher Training and workshops?": { q: "Je, mnatoa Mafunzo ya Ualimu wa Yoga na warsha?", a: "Ndiyo. Tunatoa Mafunzo ya Ualimu wa Yoga SOMA 200, kozi fupi na warsha. Programu zijazo zinatangazwa kupitia tovuti yetu." },
  "What should I wear for a session?": { q: "Nivae nini kwa kipindi?", a: "Vaa nguo za kustarehesha zinazoruhusu mwendo bila kizuizi. Epuka milo mizito kabla ya kipindi." },
  "Do I need to bring my own yoga mat or props?": { q: "Je, nahitaji kuleta mkeka wangu wa yoga?", a: "Hapana. SomaWellness inatoa mikeka ya yoga, vitalu na vifaa vyote. Unakaribishwa kuleta mkeka wako kama unapendelea." },
  "How long is a typical session?": { q: "Kipindi cha kawaida huchukua muda gani?", a: "Muda unategemea uzoefu: vipindi vya kikundi ~dakika 60, vipindi binafsi ~dakika 60, umakini ~dakika 30–60. Muda halisi unathibitishwa wakati wa kuweka nafasi." },
  "How do I know which program is right for me?": { q: "Nitajuaje programu gani inanifaa?", a: "Mwambie timu yetu unachotafuta na tutakupendekezea kipindi au kifurushi kinachofaa." },
  "How can I book a session?": { q: "Nawezaje kuweka nafasi ya kipindi?", a: "Vipindi vinaweza kuwekwa nafasi kupitia Simu / WhatsApp, Barua pepe, Tovuti, au Mapokezi ya SomaWellness, Nairobi." },
  "Can I visit before becoming a member?": { q: "Je, naweza kutembelea kituo kabla ya kuchukua uanachama?", a: "Ndiyo. Wateja watarajiwa wanakaribishwa kujifunza kuhusu kituo chetu kabla ya kuchagua uanachama." },
};

export default function PageFAQSection({ title = "Common questions", subtitle, questions, compact = false }) {
  const { t, i18n } = useTranslation();
  const isSw = (i18n.language || "en").startsWith("sw");
  const [open, setOpen] = useState(0);
  const rawItems = (questions || [])
    .map((q) => FAQ_ITEMS.find((f) => f.q === q))
    .filter(Boolean);
  const items = isSw ? rawItems.map((it) => SW_FAQ_MAP[it.q] || it) : rawItems;
  if (!items.length) return null;
  return (
    <section style={{ maxWidth: compact ? 960 : 1440, margin: "0 auto", padding: compact ? "0 clamp(20px,4vw,40px) 32px" : "36px clamp(20px,4vw,40px) 32px" }}>
      <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 18px" }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--soma-primary)", display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-gold)", flexShrink: 0 }} aria-hidden="true" /> {subtitle || (isSw ? t("faq.categories.practical") : "Questions & guidance")}
        </span>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: compact ? 20 : 24, fontWeight: 300, color: "var(--soma-forest)", marginTop: 8, letterSpacing: "-0.02em" }}>{title}</h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} style={{ background: isOpen ? "linear-gradient(135deg, #183D2D 0%, #1e4d3a 100%)" : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.92) 100%)", border: `1px solid ${isOpen ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.62)"}`, borderRadius: 16, overflow: "hidden", boxShadow: isOpen ? "0 12px 32px rgba(24,61,45,0.14)" : "0 6px 20px rgba(24,61,45,0.06), inset 0 1px 0 rgba(255,255,255,0.72)" }}>
              <button onClick={() => setOpen(isOpen ? -1 : i)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "15px 16px", textAlign: "left", background: "transparent", color: isOpen ? "#fff" : "var(--soma-forest)", cursor: "pointer", border: "none" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.3 }}>{item.q}</span>
                <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.22, ease: EASE }} style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${isOpen ? "rgba(255,255,255,0.22)" : "rgba(38,51,44,0.10)"}`, background: isOpen ? "rgba(255,255,255,0.12)" : "var(--soma-ivory)", color: isOpen ? "#fff" : "var(--soma-forest)", flexShrink: 0, fontSize: 16 }}>+</motion.span>
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.26, ease: EASE }}>
                    <div style={{ padding: "12px 16px 16px", fontSize: 12.5, lineHeight: 1.7, color: isOpen ? "rgba(255,247,230,0.88)" : "#5a6b63", borderTop: `1px solid ${isOpen ? "rgba(255,255,255,0.10)" : "var(--soma-line-light)"}` }}>{item.a}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: "center", marginTop: 14 }}>
        <Link to="/faq" style={{ fontSize: 11, fontWeight: 700, color: "var(--soma-primary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{isSw ? t("common.viewAllFaqs", { count: 25 }) : "View all 25 FAQs →"}</Link>
      </div>
    </section>
  );
}
