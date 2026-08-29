import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { FAQ_ITEMS } from "../../config/siteContent.js";
import { EASE } from "../../lib/motion.js";
import { useTranslation } from "react-i18next";

export const SW_FAQ_MAP = {
  "What is SOMA Wellness?": { q: "SOMA Wellness ni nini?", a: "SOMA Wellness ni kituo jumuishi cha yoga na ustawi Spring Valley, Nairobi kilichoundwa kusaidia afya ya mwili, ustawi wa akili, utulivu na maisha yenye usawa zaidi. Tunakusanya Yoga, Tiba ya Yoga, Kutafakari, Mazoezi ya Kupumua, Masaji, Matibabu ya Ustawi na mazoea ya maisha ya umakini katika mazingira tulivu na ya kukaribisha. Mbinu yetu si mazoezi tu — tunazingatia mwili, pumzi na akili kama jumla moja." },
  "Where are you located?": { q: "Mpo wapi?", a: "SOMA Wellness iko Spring Valley, Nairobi, Kenya. Kituo kimebuniwa kama nafasi tulivu ya ustawi mbali na hisia ya gym au kliniki ya kawaida, huku kikiwa rahisi kufikiwa ndani ya Nairobi. Anwani Kamili: Spring Valley, Nairobi, Kenya." },
  "What services are available at SOMA Wellness?": { q: "Ni huduma gani zinazopatikana SOMA Wellness?", a: "SOMA inatoa: Madarasa ya Yoga ya Kikundi, Yoga ya Faragha / Ana kwa Ana, Tiba ya Yoga, Kutafakari, Pranayama & Mazoezi ya Kupumua, Usimamizi wa Msongo, Masaji, Steam / Matambiko ya Ustawi, Yoga ya Wajawazito & Baada ya Kujifungua, Yoga ya Watoto, Yoga Rafiki kwa Wazee, Yoga ya Mashirika, Ushauri wa Ustawi, Warsha Maalum, Mafunzo ya Ualimu wa Yoga na Vifurushi Jumuishi vya Ustawi. Huduma zinaweza kuanzishwa kwa awamu." },
  "Is SOMA Wellness only for people who practise Yoga?": { q: "Je, SOMA Wellness ni kwa watu wanaofanya Yoga tu?", a: "Hapana. Ingawa Yoga ndiyo msingi wa falsafa yetu, SOMA imebuniwa kwa yeyote anayependa kuboresha ustawi wa jumla — kutafakari, usimamizi wa msongo, utulivu, masaji, steam, tiba ya yoga, mazoezi ya kupumua na msaada wa mtindo wa maisha. Unaweza kuchagua huduma moja au kuzichanganya kupitia programu jumuishi." },
  "What makes SOMA Wellness different from a regular gym, Yoga studio or spa?": { q: "Nini kinachofanya SOMA Wellness kuwa tofauti na gym, studio au spa ya kawaida?", a: "SOMA imebuniwa kama kituo jumuishi cha ustawi badala ya studio, gym au spa tu. Tunakusanya mwendo, pumzi, umakini, tiba, utulivu, elimu na mtindo wa maisha chini ya falsafa jumuishi ya ustawi. Unaweza kuja kufanya Yoga, lakini lengo letu kuu ni kukusaidia kujenga uhusiano bora na mwili wako, pumzi, akili na maisha ya kila siku." },
  "Do I need previous Yoga experience to join?": { q: "Je, nahitaji uzoefu wa awali wa Yoga kujiunga?", a: "Hapana kabisa. Wanaoanza wanakaribishwa. Waalimu wetu huongoza washiriki kulingana na uwezo, unyumbufu, umri na uzoefu wa mtu binafsi. Huhitaji kuwa mwepesi kabla ya kuanza — Yoga hukusaidia kujenga unyumbufu, nguvu, uelewa na usawa hatua kwa hatua." },
  "What is Yoga Therapy?": { q: "Tiba ya Yoga ni nini?", a: "Tiba ya Yoga ni matumizi ya kibinafsi ya mazoea ya Yoga kulingana na mahitaji, vikwazo na malengo ya afya ya mtu. Programu inaweza kujumuisha postures zilizorekebishwa, miondoko ya matibabu, mazoezi ya kupumua, mbinu za kupumzika, kutafakari na mwongozo wa mtindo wa maisha. Inaweza kusaidia kwa ugumu, matatizo ya mkao, msongo, kupungua kwa uhamaji au usumbufu wa misuli unaojirudia. Inakusudiwa kukamilisha matibabu, si kuchukua nafasi ya uchunguzi wa daktari." },
  "How is Yoga Therapy different from a regular Yoga class?": { q: "Tiba ya Yoga inatofautianaje na darasa la kawaida la Yoga?", a: "Darasa la kawaida hufuata mazoezi yaliyopangwa kwa kikundi. Tiba ya Yoga ni ya kibinafsi zaidi — tunajadili historia yako ya afya, mtindo wa maisha, vikwazo na malengo ya ustawi, kisha tunapanga mazoezi yanayokufaa wewe binafsi. Kulingana na mahitaji, Tiba ya Yoga inaweza kutolewa kama kipindi cha mtu binafsi au kupitia programu maalum ya matibabu." },
  "Do I need a consultation before starting Yoga Therapy?": { q: "Je, nahitaji ushauri kabla ya kuanza Tiba ya Yoga?", a: "Kwa Tiba ya Yoga ya kibinafsi, tathmini au ushauri wa awali unapendekezwa. Hii hutusaidia kuelewa matatizo yako ya afya, historia ya matibabu, mtindo wa maisha, majeraha ya awali, vikwazo vya sasa, viwango vya msongo na malengo binafsi, ili tuweze kupendekeza programu inayofaa zaidi." },
  "Can people with medical conditions join SOMA Wellness?": { q: "Je, watu wenye hali za kiafya wanaweza kujiunga na SOMA Wellness?", a: "Katika hali nyingi, ndiyo, lakini inategemea mtu na hali yake. Tafadhali mjulishe timu yetu kuhusu hali yoyote ya kiafya, upasuaji wa hivi karibuni, ujauzito, jeraha, maumivu ya muda mrefu, hali ya moyo, kizuizi kikubwa cha uhamaji, dawa au matibabu yanayoendelea kabla ya kuanza programu. Pale inapohitajika, tunaweza kupendekeza kupata kibali kutoka kwa mtaalamu wako wa afya." },
  "Are private Yoga sessions available?": { q: "Je, vipindi vya Yoga vya faragha vinapatikana?", a: "Ndiyo. SOMA inatoa vipindi vya Yoga vya faragha vya ana kwa ana kwa wanaoanza, wataalamu wenye shughuli nyingi, wazee, watu wenye malengo maalum ya ustawi, watu wanaorejesha uhamaji, wateja wanaohitaji Tiba ya Yoga, na wale wanaopendelea faragha na mwongozo wa kibinafsi. Vipindi vya wanandoa au makundi madogo ya faragha vinaweza pia kupangwa." },
  "Do you offer meditation and breathing classes?": { q: "Je, mnatoa madarasa ya kutafakari na kupumua?", a: "Ndiyo. Kutafakari na kupumua kwa umakini ni sehemu muhimu ya SOMA: Kutafakari kwa Kuongozwa, Umakini, Pranayama, Uelewa wa Kupumua, Kupumzika, mazoea ya kupumua ya Kiyoga na mazoea ya usimamizi wa msongo. Vipindi hivi vimebuniwa kusaidia kujenga utulivu, uelewa, usawa wa kihisia na uwazi wa akili." },
  "Do you offer prenatal and postnatal Yoga?": { q: "Je, mnatoa Yoga ya wajawazito na baada ya kujifungua?", a: "Ndiyo. SOMA inapanga programu maalum za Yoga ya Wajawazito na Baada ya Kujifungua zenye mazoea yaliyorekebishwa ipasavyo. Yoga ya Wajawazito inazingatia miondoko laini, kupumua, kupumzika na ustawi wa jumla wakati wa ujauzito; Yoga ya Baada ya Kujifungua inasaidia kupona taratibu, uhamaji, kupumzika na kuungana tena na mwili baada ya kujifungua. Kibali cha daktari kinaweza kuombwa kulingana na hatua na hali ya afya." },
  "Is Yoga available for children?": { q: "Je, Yoga inapatikana kwa watoto?", a: "Ndiyo. Programu zetu za Yoga ya watoto huanzisha Yoga kwa njia inayofaa umri na ya kuvutia: postures rahisi, mazoezi ya kupumua, usawa na uratibu, kupumzika, umakini, uelewa wa mwili na umakini. Makundi maalum ya watoto, warsha na shughuli za ustawi wa familia zinaweza kutangazwa mara kwa mara." },
  "Do you have programs for senior citizens?": { q: "Je, mna programu kwa wazee?", a: "Ndiyo. Yoga inaweza kubadilishwa kwa umri na viwango tofauti vya uhamaji: Yoga ya Upole, Yoga inayoungwa mkono na Kiti, Kunyoosha kwa Msaada, Mazoezi ya Usawa, Mazoezi ya Kupumua, Kupumzika na Kutafakari. Msisitizo ni faraja, usalama, uhamaji na kudumisha uhuru wa utendaji, badala ya postures ngumu." },
  "Do you provide massage and wellness therapies?": { q: "Je, mnatoa masaji na matibabu ya ustawi?", a: "Ndiyo. SOMA inajumuisha masaji yaliyochaguliwa, utulivu na matibabu ya ustawi kama sehemu ya mbinu jumuishi. Kulingana na upatikanaji, wateja wanaweza kuweka nafasi ya matibabu kibinafsi au kuyachanganya na Yoga, kutafakari, steam au matambiko mengine ya ustawi. Menyu yetu ya matibabu na vifurushi vya ustawi vinaeleza muda, faida na bei ya kila huduma." },
  "Can I combine Yoga, massage, meditation and other therapies in one package?": { q: "Je, naweza kuchanganya Yoga, masaji, kutafakari na matibabu mengine kwenye kifurushi kimoja?", a: "Ndiyo — hii ni dhana ya msingi ya SOMA. Badala ya kupata huduma za ustawi kando, wateja wanaweza kuchagua safari na vifurushi jumuishi vya ustawi vinavyochanganya Yoga, Kutafakari, Masaji, Steam, Mazoezi ya Kupumua na Kupumzika kwa malengo kama Kupumzika Kina, Usimamizi wa Msongo, Kurejesha Mwili, Kufufua, Usawa wa Akili-Mwili, Ustawi wa Kibinafsi, Wanandoa na Mashirika." },
  "Do you offer corporate wellness programs?": { q: "Je, mnatoa programu za ustawi wa mashirika?", a: "Ndiyo. SOMA inatoa Yoga ya Mashirika na Ustawi Mahali pa Kazi kwa kampuni, mashirika, taasisi na timu za kitaalamu: Desk Yoga, Yoga Mahali pa Kazi, vipindi vya usimamizi wa msongo, Kutafakari, Mazoezi ya Kupumua, Uelewa wa mkao na ergonomics, warsha za ustawi wa wafanyakazi, Siku za Ustawi, programu za ustawi wa watendaji na vifurushi maalum. Vipindi vinaweza kupangwa SOMA, kwenye majengo ya shirika, au mahali panafaa." },
  "Do you conduct Yoga Teacher Training and workshops?": { q: "Je, mnaendesha Mafunzo ya Ualimu wa Yoga na warsha?", a: "Ndiyo. Elimu ni sehemu muhimu ya SOMA: Kozi za Mafunzo ya Ualimu wa Yoga, Kozi fupi za Yoga, warsha za Tiba ya Yoga, warsha za Kutafakari, programu za Pranayama, vipindi vya elimu ya ustawi, programu za maendeleo ya kitaalamu na madarasa maalum na walimu wenye uzoefu. Programu zijazo zitatangazwa kupitia tovuti na mitandao ya kijamii." },
  "What should I wear for a Yoga session?": { q: "Nivae nini kwa kipindi cha Yoga?", a: "Vaa nguo za kustarehesha, zinazopitisha hewa zinazoruhusu mwendo bila kizuizi. Huhitaji nguo maalum za Yoga. Epuka milo mizito sana kabla ya darasa — weka takriban saa 2–3 kati ya mlo mzito na mazoezi isipokuwa mtaalamu wako wa afya ameshauri vingine." },
  "Do I need to bring my own Yoga mat or props?": { q: "Je, nahitaji kuleta mkeka wangu au vifaa?", a: "SOMA inalenga kutoa vifaa muhimu vya Yoga: mikeka ya Yoga, vitalu, mikanda, mito, blanketi, viti na vifaa vingine vya msaada. Unakaribishwa pia kuleta mkeka wako binafsi kama unapendelea." },
  "How long is a typical session?": { q: "Kipindi cha kawaida huchukua muda gani?", a: "Muda wa kipindi unategemea huduma: Yoga ya Kikundi ~dakika 60, Yoga ya Faragha ~dakika 60, Tiba ya Yoga ~dakika 60 au kama inavyopendekezwa, Kutafakari / Mazoezi ya Kupumua ~dakika 30–60, Masaji / Matibabu ya Ustawi kulingana na matibabu, Vifurushi Jumuishi vya Ustawi kulingana na mchanganyiko. Muda halisi utathibitishwa wakati wa kuweka nafasi." },
  "How do I know which program is right for me?": { q: "Nitajuaje programu gani inanifaa?", a: "Huhitaji kuamua peke yako — mwambie timu yetu unachotafuta (mazoezi, unyumbufu, kupunguza msongo, utulivu, msaada wa maumivu, uhamaji bora, kutafakari, Yoga ya kibinafsi, masaji, kufufua, au ustawi wa jumla) na tunaweza kupendekeza darasa, tiba au kifurushi kinachofaa. Kwa masuala maalum zaidi, ushauri unaweza kupendekezwa." },
  "How can I book a session?": { q: "Nawezaje kuweka nafasi ya kipindi?", a: "Vipindi vinaweza kuwekwa nafasi kupitia Simu / WhatsApp, Barua pepe, Tovuti, au Mapokezi SOMA Wellness, Nairobi. Kuweka nafasi mapema kunapendekezwa hasa kwa vipindi vya faragha, Tiba ya Yoga, masaji, ushauri na vifurushi vya ustawi." },
  "Can I visit the centre before taking a membership?": { q: "Je, naweza kutembelea kituo kabla ya kuchukua uanachama?", a: "Ndiyo. Wateja watarajiwa wanakaribishwa kuwasiliana na timu yetu na kujifunza kuhusu kituo, madarasa na huduma za ustawi kabla ya kuchagua uanachama au kifurushi. Ushauri au kipindi cha utangulizi kinaweza pia kupendekezwa kulingana na programu unayovutiwa nayo." },
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
