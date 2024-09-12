import 'server-only'

import path from 'path'
import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
  streamUI,
  createStreamableValue
} from 'ai/rsc'
import { openai } from '@ai-sdk/openai'

import {
  spinner,
  BotCard,
  BotMessage,
  SystemMessage,
  Stock,
  Purchase
} from '@/components/stocks'

import { z } from 'zod'
import { EventsSkeleton } from '@/components/stocks/events-skeleton'
import { Events } from '@/components/stocks/events'
import { StocksSkeleton } from '@/components/stocks/stocks-skeleton'
import { Stocks } from '@/components/stocks/stocks'
import { StockSkeleton } from '@/components/stocks/stock-skeleton'
import {
  formatNumber,
  runAsyncFnWithoutBlocking,
  sleep,
  nanoid
} from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { SpinnerMessage, UserMessage } from '@/components/stocks/message'
import { Chat, Message } from '@/lib/types'
import { auth } from '@/auth'

async function confirmPurchase(symbol: string, price: number, amount: number) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  const purchasing = createStreamableUI(
    <div className="inline-flex items-start gap-1 md:items-center">
      {spinner}
      <p className="mb-2">
        Purchasing {amount} ${symbol}...
      </p>
    </div>
  )

  const systemMessage = createStreamableUI(null)

  runAsyncFnWithoutBlocking(async () => {
    await sleep(1000)

    purchasing.update(
      <div className="inline-flex items-start gap-1 md:items-center">
        {spinner}
        <p className="mb-2">
          Purchasing {amount} ${symbol}... working on it...
        </p>
      </div>
    )

    await sleep(1000)

    purchasing.done(
      <div>
        <p className="mb-2">
          You have successfully purchased {amount} ${symbol}. Total cost:{' '}
          {formatNumber(amount * price)}
        </p>
      </div>
    )

    systemMessage.done(
      <SystemMessage>
        You have purchased {amount} shares of {symbol} at ${price}. Total cost ={' '}
        {formatNumber(amount * price)}.
      </SystemMessage>
    )

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'system',
          content: `[User has purchased ${amount} shares of ${symbol} at ${price}. Total cost = ${
            amount * price
          }]`
        }
      ]
    })
  })

  return {
    purchasingUI: purchasing.value,
    newMessage: {
      id: nanoid(),
      display: systemMessage.value
    }
  }
}

async function submitUserMessage(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  const result = await streamUI({
    model: openai('gpt-4o-mini-2024-07-18'),
    initial: <SpinnerMessage />,
    system: `\
    Ești un expert în legislația și dreptul muncii din România, cu peste 30 de ani de experiență practică. 
    Vei răspunde exclusiv în limba română. Fiecare răspuns trebuie să fie clar, precis și detaliat, adaptat la contextul specific al întrebării și să includă exemple practice relevante atunci când este necesar. 
    Dacă întrebarea nu se referă la Codul muncii, răspunde astfel: „Bună întrebare, dar nu are legătură cu Codul muncii românesc, așa că nu te pot ajuta. Adreseaza, te rog, o intrebare legata de Codul Muncii.” 
    Pentru întrebările neclare, solicită informații suplimentare pentru a clarifica contextul.

    Acesta este Codul Muncii din Romania, in ultima varianta : 
    "Parlamentul României

CODUL MUNCII Republicat*)

adoptat prin Legea Nr. 53 din 24 ianuarie 2003


Publicat în: Baza de date "EUROLEX"

D.C.C. Nr. 279/23.04.2015 Publicată în M.Of. Nr. 431/17.06.2015

**) Trimiterile la Codul de procedură civilă din 1865 se consideră a fi făcute, atunci când este cazul, la dispoziţ ile corespunzătoare care le înlocuiesc din noul Cod de procedură civilă (a se vedea art. 2 din Legea nr. 76/2012).

***) Republicat în temeiul art. V din Legea nr. 40/2011 pentru modificarea şi completarea Leg i nr. 53/2003 - Codul muncii, publicată în Monitorul Oficial al României, Partea I, nr. 225 din 31 martie 2011, dându-se textelor o nouă numerotare.
Legea nr. 53/2003 - Codul muncii a fost publicată în Monitorul Oficial al României, Partea I, nr. 72 din 5 februarie 2003, şi a mai fost modificată şi completată prin:
Legea nr. 480/2003 pentru modificarea lit. e) a art. 50 din Legea nr. 53/2003 - Codul muncii, publicată în Monitorul Oficial al României, Partea I, nr. 814 din 18 noiembrie 2003;
Legea nr. 541/2003 pentru modificarea unor dispoziţ i ale Leg i nr. 53/2003 - Codul muncii, publicată în Monitorul Oficial al României, Partea I, nr. 913 din 19 decembrie 2003;
Ordonanţa de urgenţă a Guvernului nr. 65/2005 privind modificarea şi completarea Leg i nr. 53/2003 - Codul muncii, publicată în Monitorul Oficial al României, Partea I, nr. 576 din 5 iulie 2005, aprobată cu modificări şi completări prin Legea nr. 371/2005, publicată în Monitorul Oficial al României, Partea I, nr. 1.147 din 19 decembrie 2005;
Legea nr. 241/2005 pentru prevenirea şi combaterea evaziun i fiscale, publicată în Monitorul Oficial al României, Partea I, nr. 672 din 27 iulie 2005, cu modificările ulterioare;
Ordonanţa de urgenţă a Guvernului nr. 55/2006 pentru modificarea şi completarea Leg i nr. 53/2003 - Codul muncii, publicată în Monitorul Oficial al României, Partea I, nr. 788 din 18 septembrie 2006, aprobată cu completări prin Legea nr. 94/2007, publicată în Monitorul Oficial al României, Partea I, nr. 264 din 19 aprilie 2007;
Legea nr. 237/2007 privind modificarea alin. (1) al art. 269 din Legea nr. 53/2003 - Codul muncii, publicată în Monitorul Oficial al României, Partea I, nr. 497 din 25 iulie 2007;
Legea nr. 202/2008 pentru modificarea alin. (1) al art. 134 din Legea nr. 53/2003 - Codul muncii, publicată în Monitorul Oficial al României, Partea I, nr. 728 din 28 octombrie 2008;
Ordonanţa de urgenţă a Guvernului nr. 148/2008 pentru modificarea Leg i nr. 53/2003 - Codul muncii, publicată în Monitorul Oficial al României, Partea I, nr. 765 din 13 noiembrie 2008, aprobată prin Legea nr. 167/2009, publicată în Monitorul Oficial al României, Partea I, nr. 321 din 14 mai 2009;
Legea nr. 331/2009 privind modificarea lit. e) a alin. (1) al art. 276 din Legea nr. 53/2003 - Codul muncii, publicată în Monitorul Oficial al României, Partea I, nr. 779 din 13 noiembrie 2009;

Legea nr. 49/2010 privind unele măsuri în domeniul muncii şi asigurărilor sociale, publicată în Monitorul Oficial al României, Partea I, nr. 195 din 29 martie 2010.

Titlul I
Dispoziţii generale

Cap. I
Domeniul de aplicare

Art. 1 - (1) Prezentul cod reglementează domeniul raporturilor de muncă, modul în care se efectuează controlul aplicăr i reglementărilor din domeniul raporturilor de muncă, precum şi jurisdicţia munc i.
(2) Prezentul cod se aplică şi raporturilor de muncă reglementate prin legi speciale, numai în măsura în care acestea nu conţin dispoziţ i specifice derogator i.
Art. 2 - Dispoziţ ile cuprinse în prezentul cod se aplică:
cetăţenilor români încadraţi cu contract individual de muncă, care prestează muncă în România;
cetăţenilor români încadraţi cu contract individual de muncă şi care prestează activitatea în străinătate, în baza unor contracte încheiate cu un angajator român, cu excepţia cazului în care legislaţia statului pe al cărui teritoriu se execută contractul individual de muncă este mai favorabilă;
cetăţenilor străini sau apatrizi încadraţi cu contract individual de muncă, care prestează muncă pentru un angajator român pe teritoriul României;
persoanelor care au dobândit statutul de refugiat şi se încadrează cu contract individual de muncă pe teritoriul României, în condiţ ile leg i;
ucenicilor care prestează muncă în baza unui contract de ucenicie la locul de muncă;
angajatorilor, persoane fizice şi juridice;
organizaţ ilor sindicale şi patronale.

Cap. II
Principii fundamentale

Art. 3 - (1) Libertatea muncii este garantată prin Constituţie. Dreptul la muncă nu poate fi îngrădit.
Orice persoană este liberă în alegerea locului de muncă şi a profesiei, meseriei sau activităţ i pe care urmează să o presteze.
Nimeni nu poate fi obligat să muncească sau să nu muncească într-un anumit loc de muncă ori într-o anumită profesie, oricare ar fi acestea.
Orice contract de muncă încheiat cu nerespectarea dispoziţ ilor alin. (1) - (3) este nul de drept. Art. 4 - (1) Munca forţată este interzisă.
Termenul muncă forţată desemnează orice muncă sau serviciu impus unei persoane sub ameninţare ori pentru care persoana nu şi-a exprimat consimţământul în mod liber.
Nu constituie muncă forţată munca sau activitatea impusă de autorităţile publice:
în temeiul leg i privind serviciul militar obligatoriu**);
pentru îndeplinirea obligaţ ilor civice stabilite prin lege;
în baza unei hotărâri judecătoreşti de condamnare, rămasă definitivă, în condiţ ile leg i;
în caz de forţă majoră, respectiv în caz de război, catastrofe sau pericol de catastrofe precum: incend i, inundaţ i, cutremure, epidem i sau epizoot i violente, invaz i de animale sau insecte şi, în general, în toate circumstanţele care pun în pericol viaţa sau condiţ ile normale de existenţă ale ansamblului populaţiei ori ale unei

părţi a acesteia.

**) A se vedea Legea nr. 395/2005 privind suspendarea pe timp de pace a serviciului militar obligatoriu şi trecerea la serviciul militar pe bază de voluntariat, publicată în Monitorul Oficial al României, Partea I, nr. 1.155 din 20 decembrie 2005, cu modificările ulterioare.

Art. 5 - (1) În cadrul relaţ ilor de muncă funcţionează principiul egalităţ i de tratament faţă de toţi salariaţ i şi angajator i.
Orice discriminare directă sau indirectă faţă de un salariat, bazată pe criter i de sex, orientare sexuală, caracteristici genetice, vârstă, apartenenţă naţională, rasă, culoare, etnie, religie, opţiune politică, origine socială, handicap, situaţie sau responsabilitate familială, apartenenţă ori activitate sindicală, este interzisă.
Constituie discriminare directă actele şi faptele de excludere, deosebire, restricţie sau preferinţă, întemeiate pe unul sau mai multe dintre criter ile prevăzute la alin. (2), care au ca scop sau ca efect neacordarea, restrângerea ori înlăturarea recunoaşter i, folosinţei sau exercităr i drepturilor prevăzute în legislaţia munc i.
Constituie discriminare indirectă actele şi faptele întemeiate în mod aparent pe alte criter i decât cele prevăzute la alin. (2), dar care produc efectele unei discriminări directe.
Art. 6 - (1) Orice salariat care prestează o muncă beneficiază de condiţ i de muncă adecvate activităţ i desfăşurate, de protecţie socială, de securitate şi sănătate în muncă, precum şi de respectarea demnităţ i şi a conşt inţei sale, fără nicio discriminare.
(2) Tuturor salariaţilor care prestează o muncă le sunt recunoscute dreptul la negocieri colective, dreptul la protecţia datelor cu caracter personal, precum şi dreptul la protecţie împotriva concedierilor nelegale.
(3) Pentru munca egală sau de valoare egală este interzisă orice discriminare bazată pe criteriul de sex cu privire la toate elementele şi condiţ ile de remunerare.
Art. 7 - Salariaţ i şi angajator i se pot asocia liber pentru apărarea drepturilor şi promovarea intereselor lor profesionale, economice şi sociale.
Art. 8 - (1) Relaţ ile de muncă se bazează pe principiul consensualităţ i şi al bunei-credinţe.
(2) Pentru buna desfăşurare a relaţ ilor de muncă, participanţ i la raporturile de muncă se vor informa şi se vor consulta reciproc, în condiţ ile leg i şi ale contractelor colective de muncă.
Art. 9 - Cetăţen i români sunt liberi să se încadreze în muncă în statele membre ale Uniun i Europene, precum şi în oricare alt stat, cu respectarea normelor dreptului internaţional al munc i şi a tratatelor bilaterale la care România este parte.

Titlul II
Contractul individual de muncă

Cap. I
Încheierea contractului individual de muncă

Art. 10 - Contractul individual de muncă este contractul în temeiul căruia o persoană fizică,
denumită salariat, se obligă să presteze munca pentru şi sub autoritatea unui angajator, persoană fizică sau juridică, în schimbul unei remuneraţ i denumite salariu.
Art. 11 - Clauzele contractului individual de muncă nu pot conţine prevederi contrare sau drepturi sub nivelul minim stabilit prin acte normative ori prin contracte colective de muncă.
Art. 12 - (1) Contractul individual de muncă se încheie pe durată nedeterminată.
(2) Prin excepţie, contractul individual de muncă se poate încheia şi pe durată determinată, în condiţ ile expres

prevăzute de lege.
Art. 13 - (1) Persoana fizică dobândeşte capacitate de muncă la împlinirea vârstei de 16 ani.
Persoana fizică poate încheia un contract de muncă în calitate de salariat şi la împlinirea vârstei de 15 ani, cu acordul părinţilor sau al reprezentanţilor legali, pentru activităţi potrivite cu dezvoltarea fizică, aptitudinile şi cunoştinţele sale, dacă astfel nu îi sunt periclitate sănătatea, dezvoltarea şi pregătirea profesională.
Încadrarea în muncă a persoanelor sub vârsta de 15 ani este interzisă.
Încadrarea în muncă a persoanelor puse sub interdicţie judecătorească este interzisă.
Încadrarea în muncă în locuri de muncă grele, vătămătoare sau periculoase se poate face după împlinirea vârstei de 18 ani; aceste locuri de muncă se stabilesc prin hotărâre a Guvernului.
Art. 14 - (1) În sensul prezentului cod, prin angajator se înţelege persoana fizică sau juridică ce poate, potrivit leg i, să angajeze forţă de muncă pe bază de contract individual de muncă.
Persoana juridică poate încheia contracte individuale de muncă, în calitate de angajator, din momentul dobândir i personalităţ i juridice.
Persoana fizică dobândeşte capacitatea de a încheia contracte individuale de muncă în calitate de angajator, din momentul dobândir i capacităţ i depline de exerciţiu.
Art. 15 - Este interzisă, sub sancţiunea nulităţ i absolute, încheierea unui contract individual de muncă în scopul prestăr i unei munci sau a unei activităţi ilicite ori imorale.
Art. 16 - (1) Contractul individual de muncă se încheie în baza consimţământului părţilor, în formă scrisă, în limba română. Obligaţia de încheiere a contractului individual de muncă în formă scrisă revine angajatorului.
Forma scrisă este obligatorie pentru încheierea valabilă a contractului.
Anterior începer i activităţ i, contractul individual de muncă se înregistrează în registrul general de evidenţă a salariaţilor, care se transmite inspectoratului teritorial de muncă.
Angajatorul este obligat ca, anterior începer i activităţ i, să înmâneze salariatului un exemplar din contractul individual de muncă.
Munca prestată în temeiul unui contract individual de muncă constituie vechime în muncă.
Absenţele nemotivate şi conced ile fără plată se scad din vechimea în muncă.
Fac excepţie de la prevederile alin. (5) conced ile pentru formare profesională fără plată, acordate în condiţ ile art. 155 şi 156.
Art. 17 - (1) Anterior încheier i sau modificăr i contractului individual de muncă, angajatorul are obligaţia de a informa persoana selectată în vederea angajăr i ori, după caz, salariatul, cu privire la clauzele esenţiale pe care intenţionează să le înscrie în contract sau să le modifice.
Obligaţia de informare a persoanei selectate în vederea angajăr i sau a salariatului se consideră îndeplinită de către angajator la momentul semnăr i contractului individual de muncă sau a actului adiţional, după caz.
Persoana selectată în vederea angajăr i ori salariatul, după caz, va fi informată cu privire la cel puţin următoarele elemente:
identitatea părţilor;
locul de muncă sau, în lipsa unui loc de muncă fix, posibilitatea ca salariatul să muncească în diverse locuri;
sediul sau, după caz, domiciliul angajatorului;
funcţia/ocupaţia conform specificaţiei Clasificăr i ocupaţ ilor din România sau altor acte normative, precum şi fişa postului, cu specificarea atribuţ ilor postului;
criter ile de evaluare a activităţ i profesionale a salariatului aplicabile la nivelul angajatorului;
riscurile specifice postului;
data de la care contractul urmează să îşi producă efectele;
în cazul unui contract de muncă pe durată determinată sau al unui contract de muncă temporară, durata acestora;

durata concediului de odihnă la care salariatul are dreptul;
condiţ ile de acordare a preavizului de către părţile contractante şi durata acestuia;
salariul de bază, alte elemente constitutive ale veniturilor salariale, precum şi periodicitatea plăţ i salariului la care salariatul are dreptul;
durata normală a munc i, exprimată în ore/zi şi ore/săptămână;
indicarea contractului colectiv de muncă ce reglementează condiţ ile de muncă ale salariatului;
durata perioadei de probă.
Elementele din informarea prevăzută la alin. (3) trebuie să se regăsească şi în conţinutul contractului individual de muncă.
Orice modificare a unuia dintre elementele prevăzute la alin. (3) în timpul executăr i contractului individual de muncă impune încheierea unui act adiţional la contract, într-un termen de 20 de zile lucrătoare de la data apariţiei modificăr i, cu excepţia situaţ ilor în care o asemenea modificare este prevăzută în mod expres de lege.
La negocierea, încheierea sau modificarea contractului individual de muncă, oricare dintre părţi poate fi asistată de terţi, conform propriei opţiuni, cu respectarea prevederilor alin. (7).
Cu privire la informaţ ile furnizate salariatului, prealabil încheier i contractului individual de muncă, între părţi poate interveni un contract de confidenţialitate.
Art. 18 - (1) În cazul în care persoana selectată în vederea angajăr i ori salariatul, după caz, urmează să îşi desfăşoare activitatea în străinătate, angajatorul are obligaţia de a-i comunica în timp util, înainte de plecare, informaţ ile prevăzute la art. 17 alin. (3), precum şi informaţ i referitoare la:
durata perioadei de muncă ce urmează să fie prestată în străinătate;
moneda în care vor fi plătite drepturile salariale, precum şi modalităţile de plată;
prestaţ ile în bani şi/sau în natură aferente desfăşurăr i activităţ i în străinătate;
condiţ ile de climă;
reglementările principale din legislaţia munc i din acea ţară;
obiceiurile locului a căror nerespectare i-ar pune în pericol viaţa, libertatea sau siguranţa personală;
condiţ ile de repatriere a lucrătorului, după caz.
(2) Informaţ ile prevăzute la alin. (1) lit. a), b) şi c) trebuie să se regăsească şi în conţinutul contractului individual de muncă.
(3) Dispoziţ ile alin. (1) se completează prin legi speciale care reglementează condiţ ile specifice de muncă în străinătate.
Art. 19 - În situaţia în care angajatorul nu îşi execută obligaţia de informare prevăzută la art. 17 şi 18, persoana selectată în vederea angajăr i ori salariatul, după caz, are dreptul să sesizeze, în termen de 30 de zile de la data neîndeplinir i acestei obligaţ i, instanţa judecătorească competentă şi să solicite despăgubiri corespunzătoare prejudiciului pe care l-a suferit ca urmare a neexecutăr i de către angajator a obligaţiei de informare.
Art. 20 - (1) În afara clauzelor esenţiale prevăzute la art. 17, între părţi pot fi negociate şi cuprinse în contractul individual de muncă şi alte clauze specifice.
(2) Sunt considerate clauze specifice, fără ca enumerarea să fie limitativă:
clauza cu privire la formarea profesională;
clauza de neconcurenţă;
clauza de mobilitate;
clauza de confidenţialitate.
Art. 21 - (1) La încheierea contractului individual de muncă sau pe parcursul executăr i acestuia, părţile pot negocia şi cuprinde în contract o clauză de neconcurenţă prin care salariatul să fie obligat ca după încetarea contractului să nu presteze, în interes propriu sau al unui terţ, o activitate care se află în concurenţă cu cea

prestată la angajatorul său, în schimbul unei indemnizaţ i de neconcurenţă lunare pe care angajatorul se obligă să o plătească pe toată perioada de neconcurenţă.
Clauza de neconcurenţă îşi produce efectele numai dacă în cuprinsul contractului individual de muncă sunt prevăzute în mod concret activităţile ce sunt interzise salariatului la data încetăr i contractului, cuantumul indemnizaţiei de neconcurenţă lunare, perioada pentru care îşi produce efectele clauza de neconcurenţă, terţ i în favoarea cărora se interzice prestarea activităţ i, precum şi aria geografică unde salariatul poate fi în reală competiţie cu angajatorul.
Indemnizaţia de neconcurenţă lunară datorată salariatului nu este de natură salarială, se negociază şi este de cel puţin 50% din media veniturilor salariale brute ale salariatului din ultimele 6 luni anterioare datei încetăr i contractului individual de muncă sau, în cazul în care durata contractului individual de muncă a fost mai mică de 6 luni, din media veniturilor salariale lunare brute cuvenite acestuia pe durata contractului.
Indemnizaţia de neconcurenţă reprezintă o cheltuială efectuată de angajator, este deductibilă la calculul profitului impozabil şi se impozitează la persoana fizică beneficiară, potrivit leg i.
Art. 22 - (1) Clauza de neconcurenţă îşi poate produce efectele pentru o perioadă de maximum 2 ani de la data încetăr i contractului individual de muncă.
(2) Prevederile alin. (1) nu sunt aplicabile în cazurile în care încetarea contractului individual de muncă s-a produs de drept, cu excepţia cazurilor prevăzute la art. 56 alin. (1) lit. c), e), f), g) şi i), ori a intervenit din iniţiativa angajatorului pentru motive care nu ţin de persoana salariatului.
Art. 23 - (1) Clauza de neconcurenţă nu poate avea ca efect interzicerea în mod absolut a exercităr i profesiei salariatului sau a specializăr i pe care o deţine.
(2) La sesizarea salariatului sau a inspectoratului teritorial de muncă instanţa competentă poate diminua efectele clauzei de neconcurenţă.
Art. 24 - În cazul nerespectăr i, cu vinovăţie, a clauzei de neconcurenţă salariatul poate fi obligat la restituirea indemnizaţiei şi, după caz, la daune-interese corespunzătoare prejudiciului pe care l-a produs angajatorului.
Art. 25 - (1) Prin clauza de mobilitate părţile în contractul individual de muncă stabilesc că, în considerarea specificului munc i, executarea obligaţ ilor de serviciu de către salariat nu se realizează într-un loc stabil de muncă. În acest caz salariatul beneficiază de prestaţ i suplimentare în bani sau în natură.
(2) Cuantumul prestaţ ilor suplimentare în bani sau modalităţile prestaţ ilor suplimentare în natură sunt specificate în contractul individual de muncă.
Art. 26 - (1) Prin clauza de confidenţialitate părţile convin ca, pe toată durata contractului individual de muncă şi după încetarea acestuia, să nu transmită date sau informaţ i de care au luat cunoştinţă în timpul executăr i contractului, în condiţ ile stabilite în regulamentele interne, în contractele colective de muncă sau în contractele individuale de muncă.
(2) Nerespectarea acestei clauze de către oricare dintre părţi atrage obligarea celui în culpă la plata de daune- interese.
Art. 27 - (1) O persoană poate fi angajată în muncă numai în baza unui certificat medical, care constată faptul că cel în cauză este apt pentru prestarea acelei munci.
Nerespectarea prevederilor alin. (1) atrage nulitatea contractului individual de muncă.
Competenţa şi procedura de eliberare a certificatului medical, precum şi sancţiunile aplicabile angajatorului în cazul angajăr i sau schimbăr i locului ori felului munc i fără certificat medical sunt stabilite prin legi speciale.
Solicitarea, la angajare, a testelor de graviditate este interzisă.
La angajarea în domen ile sănătate, alimentaţie publică, educaţie şi în alte domen i stabilite prin acte normative se pot solicita şi teste medicale specifice.
Art. 28 - Certificatul medical este obligatoriu şi în următoarele situaţ i:
la reînceperea activităţ i după o întrerupere mai mare de 6 luni, pentru locurile de muncă având expunere la

factori nocivi profesionali, şi de un an, în celelalte situaţ i;
în cazul detaşăr i sau trecer i în alt loc de muncă ori în altă activitate, dacă se schimbă condiţ ile de muncă;
la începerea misiun i, în cazul salariaţilor încadraţi cu contract de muncă temporară;
în cazul ucenicilor, practicanţilor, elevilor şi studenţilor, în situaţia în care urmează să fie instruiţi pe meser i şi profes i, precum şi în situaţia schimbăr i meseriei pe parcursul instruir i;
periodic, în cazul celor care lucrează în condiţ i de expunere la factori nocivi profesionali, potrivit reglementărilor Ministerului Sănătăţ i;
periodic, în cazul celor care desfăşoară activităţi cu risc de transmitere a unor boli şi care lucrează în sectorul alimentar, zootehnic, la instalaţ ile de aprovizionare cu apă potabilă, în colectivităţi de cop i, în unităţi sanitare, potrivit reglementărilor Ministerului Sănătăţ i;
periodic, în cazul celor care lucrează în unităţi fără factori de risc, prin examene medicale diferenţiate în funcţie de vârstă, sex şi stare de sănătate, potrivit reglementărilor din contractele colective de muncă.
Art. 29 - (1) Contractul individual de muncă se încheie după verificarea prealabilă a aptitudinilor profesionale şi personale ale persoanei care solicită angajarea.
Modalităţile în care urmează să se realizeze verificarea prevăzută la alin. (1) sunt stabilite în contractul colectiv de muncă aplicabil, în statutul de personal - profesional sau disciplinar - şi în regulamentul intern, în măsura în care legea nu dispune altfel.
Informaţ ile cerute, sub orice formă, de către angajator persoanei care solicită angajarea cu ocazia
verificăr i prealabile a aptitudinilor nu pot avea un alt scop decât acela de a aprecia capacitatea de a ocupa postul respectiv, precum şi aptitudinile profesionale.
Angajatorul poate cere informaţ i în legătură cu persoana care solicită angajarea de la foşt i săi angajatori, dar numai cu privire la activităţile îndeplinite şi la durata angajăr i şi numai cu încunoştinţarea prealabilă a celui în cauză.
Art. 30 - (1) Încadrarea salariaţilor la instituţ ile şi autorităţile publice şi la alte unităţi bugetare se face numai prin concurs sau examen, după caz.
Posturile vacante existente în statul de funcţ i vor fi scoase la concurs, în raport cu necesităţile fiecărei unităţi prevăzute la alin. (1).
În cazul în care la concursul organizat în vederea ocupăr i unui post vacant nu s-au prezentat mai mulţi candidaţi, încadrarea în muncă se face prin examen.
Condiţ ile de organizare şi modul de desfăşurare a concursului/examenului se stabilesc prin regulament aprobat prin hotărâre a Guvernului.
Art. 31 - (1) Pentru verificarea aptitudinilor salariatului, la încheierea contractului individual de muncă se poate stabili o perioadă de probă de cel mult 90 de zile calendaristice pentru funcţ ile de execuţie şi de cel mult 120 de zile calendaristice pentru funcţ ile de conducere.
Verificarea aptitudinilor profesionale la încadrarea persoanelor cu handicap se realizează exclusiv prin modalitatea perioadei de probă de maximum 30 de zile calendaristice.
Pe durata sau la sfârşitul perioadei de probă, contractul individual de muncă poate înceta exclusiv printr-o notificare scrisă, fără preaviz, la iniţiativa oricăreia dintre părţi, fără a fi necesară motivarea acesteia.
Pe durata perioadei de probă salariatul beneficiază de toate drepturile şi are toate obligaţ ile prevăzute în legislaţia munc i, în contractul colectiv de muncă aplicabil, în regulamentul intern, precum şi în contractul individual de muncă.
Pentru absolvenţ i instituţ ilor de învăţământ superior, primele 6 luni după debutul în profesie se consideră perioadă de stagiu. Fac excepţie acele profes i în care stagiatura este reglementată prin legi speciale. La sfârşitul perioadei de stagiu, angajatorul eliberează obligatoriu o adeverinţă, care este vizată de inspectoratul teritorial de muncă în a cărui rază teritorială de competenţă acesta îşi are sediul.

Modalitatea de efectuare a stagiului prevăzut la alin. (5) se reglementează prin lege specială.
Art. 32 - (1) Pe durata executăr i unui contract individual de muncă nu poate fi stabilită decât o singură perioadă de probă.
Prin excepţie, salariatul poate fi supus la o nouă perioadă de probă în situaţia în care acesta debutează la acelaşi angajator într-o nouă funcţie sau profesie ori urmează să presteze activitatea într-un loc de muncă cu condiţ i grele, vătămătoare sau periculoase.
Perioada de probă constituie vechime în muncă.
Art. 33 - Perioada în care se pot face angajări succesive de probă ale mai multor persoane pentru acelaşi post este de maximum 12 luni.
Art. 34 - (1) Fiecare angajator are obligaţia de a înf inţa un registru general de evidenţă a salariaţilor.
Registrul general de evidenţă a salariaţilor se va înregistra în prealabil la autoritatea publică competentă, potrivit leg i, în a cărei rază teritorială se află domiciliul, respectiv sediul angajatorului, dată de la care devine document oficial.
Registrul general de evidenţă a salariaţilor se completează şi se transmite inspectoratului teritorial de muncă în ordinea angajăr i şi cuprinde elementele de identificare ale tuturor salariaţilor, data angajăr i, funcţia/ocupaţia conform specificaţiei Clasificăr i ocupaţ ilor din România sau altor acte normative, tipul contractului individual de muncă, salariul, sporurile şi cuantumul acestora, perioada şi cauzele de suspendare a contractului individual de muncă, perioada detaşăr i şi data încetăr i contractului individual de muncă.
Registrul general de evidenţă a salariaţilor este păstrat la domiciliul, respectiv sediul angajatorului, urmând să fie pus la dispoziţie inspectorului de muncă sau oricărei alte autorităţi care îl solicită, în condiţ ile leg i.
La solicitarea salariatului sau a unui fost salariat, angajatorul este obligat să elibereze un document care să ateste activitatea desfăşurată de acesta, durata activităţ i, salariul, vechimea în muncă, în meserie şi în specialitate.
În cazul încetăr i activităţ i angajatorului, registrul general de evidenţă a salariaţilor se depune la autoritatea publică competentă, potrivit leg i, în a cărei rază teritorială se află sediul sau domiciliul angajatorului, după caz.
Metodologia de întocmire a registrului general de evidenţă a salariaţilor, înregistrările care se efectuează, precum şi orice alte elemente în legătură cu întocmirea acestora se stabilesc prin hotărâre a Guvernului.
Art. 35 - (1) Orice salariat are dreptul de a munci la angajatori diferiţi sau la acelaşi angajator, în baza unor contracte individuale de muncă, benefic ind de salariul corespunzător pentru fiecare dintre acestea.
(2) Fac excepţie de la prevederile alin. (1) situaţ ile în care prin lege sunt prevăzute incompatibilităţi pentru cumulul unor funcţ i.
Art. 36 - Cetăţen i străini şi apatriz i pot fi angajaţi prin contract individual de muncă în baza avizului de angajare sau a permisului de şedere în scop de muncă, eliberată/eliberat potrivit leg i.

Cap. II
Executarea contractului individual de muncă

Art. 37 - Drepturile şi obligaţ ile privind relaţ ile de muncă dintre angajator şi salariat se stabilesc potrivit leg i, prin negociere, în cadrul contractelor colective de muncă şi al contractelor individuale de muncă.
Art. 38 - Salariaţ i nu pot renunţa la drepturile ce le sunt recunoscute prin lege. Orice tranzacţie prin care se urmăreşte renunţarea la drepturile recunoscute de lege salariaţilor sau limitarea acestor drepturi este lovită de nulitate.
Art. 39 - (1) Salariatul are, în principal, următoarele drepturi:
dreptul la salarizare pentru munca depusă;
dreptul la repaus zilnic şi săptămânal;
dreptul la concediu de odihnă anual;

dreptul la egalitate de şanse şi de tratament;
dreptul la demnitate în muncă;
dreptul la securitate şi sănătate în muncă;
dreptul la acces la formarea profesională;
dreptul la informare şi consultare;
dreptul de a lua parte la determinarea şi ameliorarea condiţ ilor de muncă şi a mediului de muncă;
dreptul la protecţie în caz de concediere;
dreptul la negociere colectivă şi individuală;
dreptul de a participa la acţiuni colective;
dreptul de a constitui sau de a adera la un sindicat;
alte drepturi prevăzute de lege sau de contractele colective de muncă aplicabile.
(2) Salariatului îi revin, în principal, următoarele obligaţ i:
obligaţia de a realiza norma de muncă sau, după caz, de a îndeplini atribuţ ile ce îi revin conform fişei postului;
obligaţia de a respecta disciplina munc i;
obligaţia de a respecta prevederile cuprinse în regulamentul intern, în contractul colectiv de muncă aplicabil, precum şi în contractul individual de muncă;
obligaţia de fidelitate faţă de angajator în executarea atribuţ ilor de serviciu;
obligaţia de a respecta măsurile de securitate şi sănătate a munc i în unitate;
obligaţia de a respecta secretul de serviciu;
alte obligaţ i prevăzute de lege sau de contractele colective de muncă aplicabile. Art. 40 - (1) Angajatorul are, în principal, următoarele drepturi:
să stabilească organizarea şi funcţionarea unităţ i;
să stabilească atribuţ ile corespunzătoare fiecărui salariat, în condiţ ile leg i;
să dea dispoziţ i cu caracter obligatoriu pentru salariat, sub rezerva legalităţ i lor;
să exercite controlul asupra modului de îndeplinire a sarcinilor de serviciu;
să constate săvârşirea abaterilor disciplinare şi să aplice sancţiunile corespunzătoare, potrivit leg i, contractului colectiv de muncă aplicabil şi regulamentului intern;
să stabilească obiectivele de performanţă individuală, precum şi criter ile de evaluare a realizăr i acestora.
(2) Angajatorului îi revin, în principal, următoarele obligaţ i:
să informeze salariaţ i asupra condiţ ilor de muncă şi asupra elementelor care privesc desfăşurarea relaţ ilor de muncă;
să asigure permanent condiţ ile tehnice şi organizatorice avute în vedere la elaborarea normelor de muncă şi condiţ ile corespunzătoare de muncă;
să acorde salariaţilor toate drepturile ce decurg din lege, din contractul colectiv de muncă aplicabil şi din contractele individuale de muncă;
să comunice periodic salariaţilor situaţia economică şi financiară a unităţ i, cu excepţia informaţ ilor sensibile sau secrete, care, prin divulgare, sunt de natură să prejudicieze activitatea unităţ i. Periodicitatea comunicărilor se stabileşte prin negociere în contractul colectiv de muncă aplicabil;
să se consulte cu sindicatul sau, după caz, cu reprezentanţ i salariaţilor în privinţa deciz ilor susceptibile să afecteze substanţial drepturile şi interesele acestora;
să plătească toate contribuţ ile şi impozitele aflate în sarcina sa, precum şi să reţină şi să vireze contribuţ ile şi impozitele datorate de salariaţi, în condiţ ile leg i;
să înf inţeze registrul general de evidenţă a salariaţilor şi să opereze înregistrările prevăzute de lege;
să elibereze, la cerere, toate documentele care atestă calitatea de salariat a solicitantului;

să asigure confidenţialitatea datelor cu caracter personal ale salariaţilor.

Cap. III
Modificarea contractului individual de muncă

Art. 41 - (1) Contractul individual de muncă poate fi modificat numai prin acordul părţilor.
Cu titlu de excepţie, modificarea unilaterală a contractului individual de muncă este posibilă numai în cazurile şi în condiţ ile prevăzute de prezentul cod.
Modificarea contractului individual de muncă se referă la oricare dintre următoarele elemente:
durata contractului;
locul munc i;
felul munc i;
condiţ ile de muncă;
salariul;
timpul de muncă şi timpul de odihnă.
Art. 42 - (1) Locul munc i poate fi modificat unilateral de către angajator prin delegarea sau detaşarea salariatului într-un alt loc de muncă decât cel prevăzut în contractul individual de muncă.
(2) Pe durata delegăr i, respectiv a detaşăr i, salariatul îşi păstrează funcţia şi toate celelalte drepturi prevăzute în contractul individual de muncă.
Art. 43 - Delegarea reprezintă exercitarea temporară, din dispoziţia angajatorului, de către salariat, a unor lucrări sau sarcini corespunzătoare atribuţ ilor de serviciu în afara locului său de muncă.
Art. 44 - (1) Delegarea poate fi dispusă pentru o perioadă de cel mult 60 de zile calendaristice în 12 luni şi se poate prelungi pentru perioade succesive de maximum 60 de zile calendaristice, numai cu acordul salariatului.
Refuzul salariatului de prelungire a delegăr i nu poate constitui motiv pentru sancţionarea disciplinară a acestuia.
(2) Salariatul delegat are dreptul la plata cheltuielilor de transport şi cazare, precum şi la o indemnizaţie de delegare, în condiţ ile prevăzute de lege sau de contractul colectiv de muncă aplicabil.
Art. 45 - Detaşarea este actul prin care se dispune schimbarea temporară a locului de muncă, din dispoziţia angajatorului, la un alt angajator, în scopul executăr i unor lucrări în interesul acestuia. În mod excepţional, prin detaşare se poate modifica şi felul munc i, dar numai cu consimţământul scris al salariatului.
Art. 46 - (1) Detaşarea poate fi dispusă pe o perioadă de cel mult un an.
În mod excepţional, perioada detaşăr i poate fi prelungită pentru motive obiective ce impun prezenţa salariatului la angajatorul la care s-a dispus detaşarea, cu acordul ambelor părţi, din 6 în 6 luni.
Salariatul poate refuza detaşarea dispusă de angajatorul său numai în mod excepţional şi pentru motive personale temeinice.
Salariatul detaşat are dreptul la plata cheltuielilor de transport şi cazare, precum şi la o indemnizaţie de detaşare, în condiţ ile prevăzute de lege sau de contractul colectiv de muncă aplicabil.
Art. 47 - (1) Drepturile cuvenite salariatului detaşat se acordă de angajatorul la care s-a dispus detaşarea.
Pe durata detaşăr i salariatul beneficiază de drepturile care îi sunt mai favorabile, fie de drepturile de la angajatorul care a dispus detaşarea, fie de drepturile de la angajatorul la care este detaşat.
Angajatorul care detaşează are obligaţia de a lua toate măsurile necesare pentru ca angajatorul la care s-a dispus detaşarea să îşi îndeplinească integral şi la timp toate obligaţ ile faţă de salariatul detaşat.
Dacă angajatorul la care s-a dispus detaşarea nu îşi îndeplineşte integral şi la timp toate obligaţ ile faţă de salariatul detaşat, acestea vor fi îndeplinite de angajatorul care a dispus detaşarea.
În cazul în care există divergenţă între cei doi angajatori sau niciunul dintre ei nu îşi îndeplineşte obligaţ ile potrivit prevederilor alin. (1) şi (2), salariatul detaşat are dreptul de a reveni la locul său de muncă de la

angajatorul care l-a detaşat, de a se îndrepta împotriva oricăruia dintre cei doi angajatori şi de a cere executarea silită a obligaţ ilor neîndeplinite.
Art. 48 - Angajatorul poate modifica temporar locul şi felul munc i, fără consimţământul salariatului, şi în cazul unor situaţ i de forţă majoră, cu titlu de sancţiune disciplinară sau ca măsură de protecţie a salariatului, în cazurile şi în condiţ ile prevăzute de prezentul cod.

Cap. IV
Suspendarea contractului individual de muncă

Art. 49 - (1) Suspendarea contractului individual de muncă poate interveni de drept, prin acordul părţilor sau prin actul unilateral al uneia dintre părţi.
Suspendarea contractului individual de muncă are ca efect suspendarea prestăr i munc i de către salariat şi a plăţ i drepturilor de natură salarială de către angajator.
Pe durata suspendăr i pot continua să existe alte drepturi şi obligaţ i ale părţilor decât cele prevăzute la alin. (2), dacă acestea sunt prevăzute prin legi speciale, prin contractul colectiv de muncă aplicabil, prin contracte individuale de muncă sau prin regulamente interne.
În cazul suspendăr i contractului individual de muncă din cauza unei fapte imputabile salariatului, pe durata suspendăr i acesta nu va beneficia de niciun drept care rezultă din calitatea sa de salariat.
De fiecare dată când în timpul perioadei de suspendare a contractului intervine o cauză de încetare de drept a contractului individual de muncă, cauza de încetare de drept prevalează.
În cazul suspendăr i contractului individual de muncă se suspendă toate termenele care au legătură cu încheierea, modificarea, executarea sau încetarea contractului individual de muncă, cu excepţia situaţ ilor în care contractul individual de muncă încetează de drept.
Art. 50 - Contractul individual de muncă se suspendă de drept în următoarele situaţ i:
concediu de maternitate;
concediu pentru incapacitate temporară de muncă;
carantină;
exercitarea unei funcţ i în cadrul unei autorităţi executive, legislative ori judecătoreşti, pe toată durata mandatului, dacă legea nu prevede altfel;
îndeplinirea unei funcţ i de conducere salarizate în sindicat;
forţă majoră;
în cazul în care salariatul este arestat preventiv, în condiţ ile Codului de procedură penală;
de la data expirăr i perioadei pentru care au fost emise avizele, autorizaţ ile ori atestările necesare pentru exercitarea profesiei. Dacă în termen de 6 luni salariatul nu şi-a reînnoit avizele, autorizaţ ile ori atestările necesare pentru exercitarea profesiei, contractul individual de muncă încetează de drept;
în alte cazuri expres prevăzute de lege.
Art. 51 - (1) Contractul individual de muncă poate fi suspendat din iniţiativa salariatului, în următoarele situaţ i:
concediu pentru creşterea copilului în vârstă de până la 2 ani sau, în cazul copilului cu handicap, până la împlinirea vârstei de 3 ani;
concediu pentru îngrijirea copilului bolnav în vârstă de până la 7 ani sau, în cazul copilului cu handicap, pentru afecţiuni intercurente, până la împlinirea vârstei de 18 ani;
concediu paternal;
concediu pentru formare profesională;
exercitarea unor funcţ i elective în cadrul organismelor profesionale constituite la nivel central sau local, pe toată durata mandatului;

participarea la grevă.
(2) Contractul individual de muncă poate fi suspendat în situaţia absenţelor nemotivate ale salariatului, în condiţ ile stabilite prin contractul colectiv de muncă aplicabil, contractul individual de muncă, precum şi prin regulamentul intern.
Art. 52 - (1) Contractul individual de muncă poate fi suspendat din iniţiativa angajatorului în următoarele situaţ i:
pe durata cercetăr i disciplinare prealabile, în condiţ ile leg i;
în cazul în care angajatorul a formulat plângere penală împotriva salariatului*) sau acesta a fost trimis în judecată pentru fapte penale incompatibile cu funcţia deţinută, până la rămânerea definitivă a hotărâr i judecătoreşti;
în cazul întreruper i sau reducer i temporare a activităţ i, fără încetarea raportului de muncă, pentru motive economice, tehnologice, structurale sau similare;
c1) în cazul în care împotriva salariatului s-a luat, în condiţ ile Codului de procedură penală, măsura controlului judiciar ori a controlului judiciar pe cauţiune, dacă în sarcina acestuia au fost stabilite obligaţ i care împiedică executarea contractului de muncă, precum şi în cazul în care salariatul este arestat la domiciliu, iar conţinutul măsur i împiedică executarea contractului de muncă;
pe durata detaşăr i;
pe durata suspendăr i de către autorităţile competente a avizelor, autorizaţ ilor sau atestărilor necesare pentru exercitarea profes ilor.
(2) În cazurile prevăzute la alin. (1) lit. a) şi b), dacă se constată nevinovăţia celui în cauză, salariatul îşi reia activitatea anterioară şi i se plăteşte, în temeiul normelor şi princip ilor răspunder i civile contractuale, o despăgubire egală cu salariul şi celelalte drepturi de care a fost lipsit pe perioada suspendăr i contractului.
(3) În cazul reducer i temporare a activităţ i, pentru motive economice, tehnologice, structurale sau similare, pe perioade care depăşesc 30 de zile lucrătoare, angajatorul va avea posibilitatea reducer i programului de lucru de la 5 zile la 4 zile pe săptămână, cu reducerea corespunzătoare a salariului, până la remedierea situaţiei care a cauzat reducerea programului, după consultarea prealabilă a sindicatului reprezentativ de la nivelul unităţ i sau a reprezentanţilor salariaţilor, după caz.

*) Dispoziţiile alin. (1) lit. b) teza I au fost declarate neconstituţionale prin D.C.C. nr.
279/2015 publicată în M.Of. nr. 431 din 17 iunie 2015. Potrivit art. 147 alin. 1 din Constituţie, "Dispoziţiile din legile şi ordonanţele în vigoare, precum şi cele din regulamente, constatate ca fiind neconstituţionale, îşi încetează efectele juridice la 45 de zile de la publicarea deciziei Curţii Constituţionale dacă, în acest interval, Parlamentul sau Guvernul, după caz, nu pun de acord prevederile neconstituţionale cu dispoziţiile Constituţiei. Pe durata acestui termen, dispoziţiile constatate ca fiind neconstituţionale sunt suspendate de drept".

Art. 53 - (1) Pe durata reducer i şi/sau a întreruper i temporare a activităţ i, salariaţ i implicaţi în activitatea redusă sau întreruptă, care nu mai desfăşoară activitate, beneficiază de o indemnizaţie, plătită din fondul de salar i, ce nu poate fi mai mică de 75% din salariul de bază corespunzător locului de muncă ocupat, cu excepţia situaţ ilor prevăzute la art. 52 alin. (3).
(2) Pe durata reducer i şi/sau a întreruper i temporare prevăzute la alin. (1), salariaţ i se vor afla la dispoziţia angajatorului, acesta având oricând posibilitatea să dispună reînceperea activităţ i.
Art. 54 - Contractul individual de muncă poate fi suspendat, prin acordul părţilor, în cazul conced ilor fără plată pentru stud i sau pentru interese personale.

Cap. V
Încetarea contractului individual de muncă

Art. 55 - Contractul individual de muncă poate înceta astfel:
de drept;
ca urmare a acordului părţilor, la data convenită de acestea;
ca urmare a voinţei unilaterale a uneia dintre părţi, în cazurile şi în condiţ ile limitativ prevăzute de lege.

Secţiunea 1
Încetarea de drept a contractului individual de muncă

Art. 56 - (1) Contractul individual de muncă existent încetează de drept:
la data decesului salariatului sau al angajatorului persoană fizică, precum şi în cazul dizolvăr i angajatorului persoană juridică, de la data la care angajatorul şi-a încetat existenţa conform leg i;
la data rămâner i irevocabile a hotărâr i judecătoreşti de declarare a morţ i sau a puner i sub interdicţie a salariatului sau a angajatorului persoană fizică;
la data îndeplinir i cumulative a condiţ ilor de vârstă standard şi a stagiului minim de cotizare pentru pensionare; la data comunicăr i deciziei de pensie în cazul pensiei de invaliditate de gradul III, pensiei anticipate parţiale, pensiei anticipate, pensiei pentru limită de vârstă cu reducerea vârstei standard de pensionare; la data comunicăr i deciziei medicale asupra capacităţ i de muncă în cazul invalidităţ i de gradul I sau II;
ca urmare a constatăr i nulităţ i absolute a contractului individual de muncă, de la data la care nulitatea a fost constatată prin acordul părţilor sau prin hotărâre judecătorească definitivă;
ca urmare a admiter i cerer i de reintegrare în funcţia ocupată de salariat a unei persoane concediate nelegal sau pentru motive neîntemeiate, de la data rămâner i definitive a hotărâr i judecătoreşti de reintegrare;
ca urmare a condamnăr i la executarea unei pedepse privative de libertate, de la data rămâner i definitive a hotărâr i judecătoreşti;
de la data retrager i de către autorităţile sau organismele competente a avizelor, autorizaţ ilor ori atestărilor necesare pentru exercitarea profesiei;
ca urmare a interzicer i exercităr i unei profes i sau a unei funcţ i, ca măsură de siguranţă ori pedeapsă complementară, de la data rămâner i definitive a hotărâr i judecătoreşti prin care s-a dispus interdicţia;
la data expirăr i termenului contractului individual de muncă încheiat pe durată determinată;
retragerea acordului părinţilor sau al reprezentanţilor legali, în cazul salariaţilor cu vârsta cuprinsă între 15 şi 16 ani.
(2) Pentru situaţ ile prevăzute la alin. (1) lit. c)-j), constatarea cazului de încetare de drept a contractului individual de muncă se face în termen de 5 zile lucrătoare de la intervenirea acestuia, în scris, prin decizie a angajatorului, şi se comunică persoanelor aflate în situaţ ile respective în termen de 5 zile lucrătoare.
Art. 57 - (1) Nerespectarea oricăreia dintre condiţ ile legale necesare pentru încheierea valabilă a contractului individual de muncă atrage nulitatea acestuia.
Constatarea nulităţ i contractului individual de muncă produce efecte pentru v itor.
Nulitatea contractului individual de muncă poate fi acoperită prin îndeplinirea ulterioară a condiţ ilor impuse de lege.
În situaţia în care o clauză este afectată de nulitate, întrucât stabileşte drepturi sau obligaţ i pentru salariaţi, care contravin unor norme legale imperative sau contractelor colective de muncă aplicabile, aceasta este înlocuită de drept cu dispoziţ ile legale sau convenţionale aplicabile, salariatul având dreptul la despăgubiri.
Persoana care a prestat munca în temeiul unui contract individual de muncă nul are dreptul la remunerarea

acesteia, corespunzător modului de îndeplinire a atribuţ ilor de serviciu.
Constatarea nulităţ i şi stabilirea, potrivit leg i, a efectelor acesteia se pot face prin acordul părţilor.
Dacă părţile nu se înţeleg, nulitatea se pronunţă de către instanţa judecătorească.

Secţiunea a 2-a Concedierea

Art. 58 - (1) Concedierea reprezintă încetarea contractului individual de muncă din iniţiativa angajatorului.
(2) Concedierea poate fi dispusă pentru motive care ţin de persoana salariatului sau pentru motive care nu ţin de persoana salariatului.
Art. 59 - Este interzisă concedierea salariaţilor:
pe criter i de sex, orientare sexuală, caracteristici genetice, vârstă, apartenenţă naţională, rasă, culoare, etnie, religie, opţiune politică, origine socială, handicap, situaţie sau responsabilitate familială, apartenenţă ori activitate sindicală;
pentru exercitarea, în condiţ ile leg i, a dreptului la grevă şi a drepturilor sindicale. Art. 60 - (1) Concedierea salariaţilor nu poate fi dispusă:
pe durata incapacităţ i temporare de muncă, stabilită prin certificat medical conform leg i;
pe durata suspendăr i activităţ i ca urmare a instituir i carantinei;
pe durata în care femeia salariată este gravidă, în măsura în care angajatorul a luat cunoştinţă de acest fapt anterior emiter i deciziei de concediere;
pe durata concediului de maternitate;
pe durata concediului pentru creşterea copilului în vârstă de până la 2 ani sau, în cazul copilului cu handicap, până la împlinirea vârstei de 3 ani;
pe durata concediului pentru îngrijirea copilului bolnav în vârstă de până la 7 ani sau, în cazul copilului cu handicap, pentru afecţiuni intercurente, până la împlinirea vârstei de 18 ani;
pe durata exercităr i unei funcţ i eligibile într-un organism sindical, cu excepţia situaţiei în care concedierea este dispusă pentru o abatere disciplinară gravă sau pentru abateri disciplinare repetate, săvârşite de către acel salariat;
pe durata efectuăr i concediului de odihnă.
(2) Prevederile alin. (1) nu se aplică în cazul concedier i pentru motive ce intervin ca urmare a reorganizăr i judiciare, a falimentului sau a dizolvăr i angajatorului, în condiţ ile leg i.

Secţiunea a 3-a
Concedierea pentru motive care ţin de persoana salariatului

Art. 61 - Angajatorul poate dispune concedierea pentru motive care ţin de persoana salariatului în următoarele situaţ i:
în cazul în care salariatul a săvârşit o abatere gravă sau abateri repetate de la regulile de disciplină a munc i ori de la cele stabilite prin contractul individual de muncă, contractul colectiv de muncă aplicabil sau regulamentul intern, ca sancţiune disciplinară;
în cazul în care salariatul este arestat preventiv sau arestat la domiciliu pentru o perioadă mai mare de 30 de zile, în condiţ ile Codului de procedură penală;
în cazul în care, prin decizie a organelor competente de expertiză medicală, se constată inaptitudinea fizică şi/sau psihică a salariatului, fapt ce nu permite acestuia să îşi îndeplinească atribuţ ile corespunzătoare locului de muncă ocupat;

în cazul în care salariatul nu corespunde profesional locului de muncă în care este încadrat.
Art. 62 - (1) În cazul în care concedierea intervine pentru unul dintre motivele prevăzute la art. 61 lit. b) - d), angajatorul are obligaţia de a emite decizia de concediere în termen de 30 de zile calendaristice de la data constatăr i cauzei concedier i.
(2) În cazul în care concedierea intervine pentru motivul prevăzut la art. 61 lit. a), angajatorul poate emite decizia de concediere numai cu respectarea dispoziţ ilor art. 247 - 252.
(3) Decizia se emite în scris şi, sub sancţiunea nulităţ i absolute, trebuie să fie motivată în fapt şi în drept şi să cuprindă precizări cu privire la termenul în care poate fi contestată şi la instanţa judecătorească la care se contestă.
Art. 63 - (1) Concedierea pentru săvârşirea unei abateri grave sau a unor abateri repetate de la regulile de disciplină a munc i poate fi dispusă numai după îndeplinirea de către angajator a cercetăr i disciplinare prealabile şi în termenele stabilite de prezentul cod.
(2) Concedierea salariatului pentru motivul prevăzut la art. 61 lit. d) poate fi dispusă numai după evaluarea prealabilă a salariatului, conform procedur i de evaluare stabilite prin contractul colectiv de muncă aplicabil sau, în lipsa acestuia, prin regulamentul intern.
Art. 64 - (1) În cazul în care concedierea se dispune pentru motivele prevăzute la art. 61 lit. c) şi d), precum şi în cazul în care contractul individual de muncă a încetat de drept în temeiul art. 56 alin. (1) lit. e), angajatorul are obligaţia de a-i propune salariatului alte locuri de muncă vacante în unitate, compatibile cu pregătirea profesională sau, după caz, cu capacitatea de muncă stabilită de medicul de medicină a munc i.
În situaţia în care angajatorul nu dispune de locuri de muncă vacante potrivit alin. (1), acesta are obligaţia de a solicita sprijinul agenţiei teritoriale de ocupare a forţei de muncă în vederea redistribuir i salariatului, corespunzător pregătir i profesionale şi/sau, după caz, capacităţ i de muncă stabilite de medicul de medicină a munc i.
Salariatul are la dispoziţie un termen de 3 zile lucrătoare de la comunicarea angajatorului, conform prevederilor alin. (1), pentru a-şi manifesta în scris consimţământul cu privire la noul loc de muncă oferit.
În cazul în care salariatul nu îşi manifestă consimţământul în termenul prevăzut la alin. (3), precum şi după notificarea cazului către agenţia teritorială de ocupare a forţei de muncă conform alin. (2), angajatorul poate dispune concedierea salariatului.
În cazul concedier i pentru motivul prevăzut la art. 61 lit. c) salariatul beneficiază de o compensaţie, în condiţ ile stabilite în contractul colectiv de muncă aplicabil sau în contractul individual de muncă, după caz.

Secţiunea a 4-a
Concedierea pentru motive care nu ţin de persoana salariatului

Art. 65 - (1) Concedierea pentru motive care nu ţin de persoana salariatului reprezintă încetarea contractului individual de muncă determinată de desf inţarea locului de muncă ocupat de salariat, din unul sau mai multe motive fără legătură cu persoana acestuia.
(2) Desf inţarea locului de muncă trebuie să fie efectivă şi să aibă o cauză reală şi serioasă.
Art. 66 - Concedierea pentru motive care nu ţin de persoana salariatului poate fi individuală sau colectivă.
Art. 67 - Salariaţ i concediaţi pentru motive care nu ţin de persoana lor beneficiază de măsuri active de combatere a şomajului şi pot beneficia de compensaţ i în condiţ ile prevăzute de lege şi de contractul colectiv de muncă aplicabil.

Secţiunea a 5-a
Concedierea colectivă. Informarea, consultarea salariaţilor şi procedura concedierilor colective

Art. 68 - (1) Prin concediere colectivă se înţelege concedierea, într-o perioadă de 30 de zile calendaristice, din unul sau mai multe motive care nu ţin de persoana salariatului, a unui număr de:
cel puţin 10 salariaţi, dacă angajatorul care disponibilizează are încadraţi mai mult de 20 de salariaţi şi mai puţin de 100 de salariaţi;
cel puţin 10% din salariaţi, dacă angajatorul care disponibilizează are încadraţi cel puţin 100 de salariaţi, dar mai puţin de 300 de salariaţi;
cel puţin 30 de salariaţi, dacă angajatorul care disponibilizează are încadraţi cel puţin 300 de salariaţi.
(2) La stabilirea numărului efectiv de salariaţi concediaţi colectiv, potrivit alin. (1), se iau în calcul şi acei salariaţi cărora le-au încetat contractele individuale de muncă din iniţiativa angajatorului, din unul sau mai multe motive, fără legătură cu persoana salariatului, cu condiţia existenţei a cel puţin 5 concedieri.
Art. 69 - (1) În cazul în care angajatorul intenţionează să efectueze concedieri colective, acesta are obligaţia de a iniţia, în timp util şi în scopul ajunger i la o înţelegere, în condiţ ile prevăzute de lege, consultări cu sindicatul sau, după caz, cu reprezentanţ i salariaţilor, cu privire cel puţin la:
metodele şi mijloacele de evitare a concedierilor colective sau de reducere a numărului de salariaţi care vor fi concediaţi;
atenuarea consecinţelor concedier i prin recurgerea la măsuri sociale care vizează, printre altele, sprijin pentru recalificarea sau reconversia profesională a salariaţilor concediaţi.
În perioada în care au loc consultări, potrivit alin. (1), pentru a permite sindicatului sau reprezentanţilor salariaţilor să formuleze propuneri în timp util, angajatorul are obligaţia să le furnizeze toate informaţ ile relevante şi să le notifice, în scris, următoarele:
numărul total şi categor ile de salariaţi;
motivele care determină concedierea preconizată;
numărul şi categor ile de salariaţi care vor fi afectaţi de concediere;
criter ile avute în vedere, potrivit leg i şi/sau contractelor colective de muncă, pentru stabilirea ordin i de prioritate la concediere;
măsurile avute în vedere pentru limitarea numărului concedierilor;
măsurile pentru atenuarea consecinţelor concedier i şi compensaţ ile ce urmează să fie acordate salariaţilor concediaţi, conform dispoziţ ilor legale şi/sau contractului colectiv de muncă aplicabil;
data de la care sau perioada în care vor avea loc concedierile;
termenul înăuntrul căruia sindicatul sau, după caz, reprezentanţ i salariaţilor pot face propuneri pentru evitarea ori diminuarea numărului salariaţilor concediaţi.
Criter ile prevăzute la alin. (2) lit. d) se aplică pentru departajarea salariaţilor după evaluarea realizăr i obiectivelor de performanţă.
Obligaţ ile prevăzute la alin. (1) şi (2) se menţin indiferent dacă decizia care determină concedierile colective este luată de către angajator sau de o întreprindere care deţine controlul asupra angajatorului.
În situaţia în care decizia care determină concedierile colective este luată de o întreprindere care deţine controlul asupra angajatorului, acesta nu se poate prevala, în nerespectarea obligaţ ilor prevăzute la alin. (1) şi (2), de faptul că întreprinderea respectivă nu i-a furnizat informaţ ile necesare.
Art. 70 - Angajatorul are obligaţia să comunice o copie a notificăr i prevăzute la art. 69 alin. (2) inspectoratului teritorial de muncă şi agenţiei teritoriale de ocupare a forţei de muncă la aceeaşi dată la care a comunicat-o sindicatului sau, după caz, reprezentanţilor salariaţilor.
Art. 71 - (1) Sindicatul sau, după caz, reprezentanţ i salariaţilor pot propune angajatorului măsuri în vederea evităr i concedierilor ori diminuăr i numărului salariaţilor concediaţi, într-un termen de 10 zile calendaristice de la data primir i notificăr i.

(2) Angajatorul are obligaţia de a răspunde în scris şi motivat la propunerile formulate potrivit prevederilor alin. (1), în termen de 5 zile calendaristice de la primirea acestora.
Art. 72 - (1) În situaţia în care, ulterior consultărilor cu sindicatul sau reprezentanţ i salariaţilor, potrivit prevederilor art. 69 şi 71, angajatorul decide aplicarea măsur i de concediere colectivă, acesta are obligaţia de a notifica în scris inspectoratul teritorial de muncă şi agenţia teritorială de ocupare a forţei de muncă, cu cel puţin 30 de zile calendaristice anterioare datei emiter i deciz ilor de concediere.
Notificarea prevăzută la alin. (1) trebuie să cuprindă toate informaţ ile relevante cu privire la intenţia de concediere colectivă, prevăzute la art. 69 alin. (2), precum şi rezultatele consultărilor cu sindicatul sau reprezentanţ i salariaţilor, prevăzute la art. 69 alin. (1) şi art. 71, în special motivele concedierilor, numărul total al salariaţilor, numărul salariaţilor afectaţi de concediere şi data de la care sau perioada în care vor avea loc aceste concedieri.
Angajatorul are obligaţia să comunice o copie a notificăr i prevăzute la alin. (1) sindicatului sau reprezentanţilor salariaţilor, la aceeaşi dată la care a comunicat-o inspectoratului teritorial de muncă şi agenţiei teritoriale de ocupare a forţei de muncă.
Sindicatul sau reprezentanţ i salariaţilor pot transmite eventuale puncte de vedere inspectoratului teritorial de muncă.
La solicitarea motivată a oricăreia dintre părţi, inspectoratul teritorial de muncă, cu avizul agenţiei teritoriale de ocupare a forţei de muncă, poate dispune reducerea perioadei prevăzute la alin. (1), fără a aduce atingere drepturilor individuale cu privire la perioada de preaviz.
Inspectoratul teritorial de muncă are obligaţia de a informa în termen de 3 zile lucrătoare angajatorul şi sindicatul sau reprezentanţ i salariaţilor, după caz, asupra reducer i sau prelungir i perioadei prevăzute la alin. (1), precum şi cu privire la motivele care au stat la baza acestei deciz i.
Art. 73 - (1) În perioada prevăzută la art. 72 alin. (1), agenţia teritorială de ocupare a forţei de muncă trebuie să caute soluţ i la problemele ridicate de concedierile colective preconizate şi să le comunice în timp util angajatorului şi sindicatului ori, după caz, reprezentanţilor salariaţilor.
La solicitarea motivată a oricăreia dintre părţi, inspectoratul teritorial de muncă, cu consultarea agenţiei teritoriale de ocupare a forţei de muncă, poate dispune amânarea momentului emiter i deciz ilor de concediere cu maximum 10 zile calendaristice, în cazul în care aspectele legate de concedierea colectivă avută în vedere nu pot fi soluţionate până la data stabilită în notificarea de concediere colectivă prevăzută la art. 72 alin. (1) ca f ind data emiter i deciz ilor de concediere.
Inspectoratul teritorial de muncă are obligaţia de a informa în scris angajatorul şi sindicatul sau reprezentanţ i salariaţilor, după caz, asupra amânăr i momentului emiter i deciz ilor de concediere, precum şi despre motivele care au stat la baza acestei deciz i, înainte de expirarea perioadei iniţiale prevăzute la art. 72 alin. (1).
Art. 74*) - (1) În termen de 45 de zile calendaristice de la data concedier i, salariatul concediat prin concediere colectivă are dreptul de a fi reangajat cu prioritate pe postul reînf inţat în aceeaşi activitate, fără examen, concurs sau perioadă de probă.
În situaţia în care în perioada prevăzută la alin. (1) se reiau aceleaşi activităţi, angajatorul va transmite salariaţilor care au fost concediaţi de pe posturile a căror activitate este reluată în aceleaşi condiţ i de competenţă profesională o comunicare scrisă, prin care sunt informaţi asupra reluăr i activităţ i.
Salariaţ i au la dispoziţie un termen de maximum 5 zile calendaristice de la data comunicăr i angajatorului, prevăzută la alin. (2), pentru a-şi manifesta în scris consimţământul cu privire la locul de muncă oferit.
În situaţia în care salariaţ i care au dreptul de a fi reangajaţi potrivit alin. (2) nu îşi manifestă în scris consimţământul în termenul prevăzut la alin. (3) sau refuză locul de muncă oferit, angajatorul poate face noi încadrări pe locurile de muncă rămase vacante.

Prevederile art. 68 - 73 nu se aplică salariaţilor din instituţ ile publice şi autorităţile publice.
Prevederile art. 68 - 73 nu se aplică în cazul contractelor individuale de muncă încheiate pe durată determinată, cu excepţia cazurilor în care aceste concedieri au loc înainte de data expirăr i acestor contracte.

*) Recurs în interesul leg i:
- Decizia Nr. 6 din 9 mai 2011 privind aplicabilitatea dispoziţ ilor art. 74 alin. (1) lit. d) din Codul munc i în situaţia în care concedierea s-a dispus din motive care nu ţin de persoana salariatului, în temeiul dispoziţ ilor art. 65 din Codul munc i.

Secţiunea a 6-a Dreptul la preaviz

Art. 75 - (1) Persoanele concediate în temeiul art. 61 lit. c) şi d), al art. 65 şi 66 beneficiază de dreptul la un preaviz ce nu poate fi mai mic de 20 de zile lucrătoare.
Fac excepţie de la prevederile alin. (1) persoanele concediate în temeiul art. 61 lit. d), care se află în perioada de probă.
În situaţia în care în perioada de preaviz contractul individual de muncă este suspendat, termenul de preaviz va fi suspendat corespunzător, cu excepţia cazului prevăzut la art. 51 alin. (2).
Art. 76 - Decizia de concediere se comunică salariatului în scris şi trebuie să conţină în mod obligatoriu:
motivele care determină concedierea;
durata preavizului;
criter ile de stabilire a ordin i de priorităţi, conform art. 69 alin. (2) lit. d), numai în cazul concedierilor colective;
lista tuturor locurilor de muncă disponibile în unitate şi termenul în care salariaţ i urmează să opteze pentru a ocupa un loc de muncă vacant, în condiţ ile art. 64.
Art. 77 - Decizia de concediere produce efecte de la data comunicăr i ei salariatului.

Secţiunea a 7-a
Controlul şi sancţionarea concedierilor nelegale

Art. 78 - Concedierea dispusă cu nerespectarea procedur i prevăzute de lege este lovită de nulitate absolută.
Art. 79 - În caz de conflict de muncă angajatorul nu poate invoca în faţa instanţei alte motive de fapt sau de drept decât cele precizate în decizia de concediere.
Art. 80 - (1) În cazul în care concedierea a fost efectuată în mod netemeinic sau nelegal, instanţa va dispune anularea ei şi va obliga angajatorul la plata unei despăgubiri egale cu salar ile indexate, majorate şi reactualizate şi cu celelalte drepturi de care ar fi beneficiat salariatul.
La solicitarea salariatului instanţa care a dispus anularea concedier i va repune părţile în situaţia anterioară emiter i actului de concediere.
În cazul în care salariatul nu solicită repunerea în situaţia anterioară emiter i actului de concediere, contractul individual de muncă va înceta de drept la data rămâner i definitive şi irevocabile a hotărâr i judecătoreşti.

Secţiunea a 8-a Demisia

Art. 81 - (1) Prin demisie se înţelege actul unilateral de voinţă a salariatului care, printr-o notificare scrisă, comunică angajatorului încetarea contractului individual de muncă, după împlinirea unui termen de preaviz.
Angajatorul este obligat să înregistreze demisia salariatului. Refuzul angajatorului de a înregistra demisia dă dreptul salariatului de a face dovada acesteia prin orice mijloace de probă.
Salariatul are dreptul de a nu motiva demisia.
Termenul de preaviz este cel convenit de părţi în contractul individual de muncă sau, după caz, cel prevăzut în contractele colective de muncă aplicabile şi nu poate fi mai mare de 20 de zile lucrătoare pentru salariaţ i cu funcţ i de execuţie, respectiv mai mare de 45 de zile lucrătoare pentru salariaţ i care ocupă funcţ i de conducere.
Pe durata preavizului contractul individual de muncă continuă să îşi producă toate efectele.
În situaţia în care în perioada de preaviz contractul individual de muncă este suspendat, termenul de preaviz va fi suspendat corespunzător.
Contractul individual de muncă încetează la data expirăr i termenului de preaviz sau la data renunţăr i totale ori parţiale de către angajator la termenul respectiv.
Salariatul poate demisiona fără preaviz dacă angajatorul nu îşi îndeplineşte obligaţ ile asumate prin contractul individual de muncă.

Cap. VI
Contractul individual de muncă pe durată determinată

Art. 82 - (1) Prin derogare de la regula prevăzută la art. 12 alin. (1), angajator i au posibilitatea de a angaja, în cazurile şi în condiţ ile prezentului cod, personal salariat cu contract individual de muncă pe durată determinată.
Contractul individual de muncă pe durată determinată se poate încheia numai în formă scrisă, cu precizarea expresă a duratei pentru care se încheie.
Contractul individual de muncă pe durată determinată poate fi prelungit, în condiţ ile prevăzute la art. 83, şi după expirarea termenului iniţial, cu acordul scris al părţilor, pentru perioada realizăr i unui proiect, program sau unei lucrări.
Între aceleaşi părţi se pot încheia succesiv cel mult 3 contracte individuale de muncă pe durată determinată.
Contractele individuale de muncă pe durată determinată încheiate în termen de 3 luni de la încetarea unui contract de muncă pe durată determinată sunt considerate contracte succesive şi nu pot avea o durată mai mare de 12 luni fiecare.
Art. 83 - Contractul individual de muncă poate fi încheiat pentru o durată determinată numai în următoarele cazuri:
înlocuirea unui salariat în cazul suspendăr i contractului său de muncă, cu excepţia situaţiei în care acel salariat participă la grevă;
creşterea şi/sau modificarea temporară a structur i activităţ i angajatorului;
desfăşurarea unor activităţi cu caracter sezonier;
în situaţia în care este încheiat în temeiul unor dispoziţ i legale emise cu scopul de a favoriza temporar anumite categor i de persoane fără loc de muncă;
angajarea unei persoane care, în termen de 5 ani de la data angajăr i, îndeplineşte condiţ ile de pensionare pentru limită de vârstă;
ocuparea unei funcţ i eligibile în cadrul organizaţ ilor sindicale, patronale sau al organizaţ ilor neguvernamentale, pe perioada mandatului;
angajarea pensionarilor care, în condiţ ile leg i, pot cumula pensia cu salariul;

în alte cazuri prevăzute expres de legi speciale ori pentru desfăşurarea unor lucrări, proiecte sau programe.
Art. 84 - (1) Contractul individual de muncă pe durată determinată nu poate fi încheiat pe o perioadă mai mare de 36 de luni.
(2) În cazul în care contractul individual de muncă pe durată determinată este încheiat pentru a înlocui un salariat al cărui contract individual de muncă este suspendat, durata contractului va expira la momentul încetăr i motivelor ce au determinat suspendarea contractului individual de muncă al salariatului titular.
Art. 85 - Salariatul încadrat cu contract individual de muncă pe durată determinată poate fi supus unei perioade de probă, care nu va depăşi:
5 zile lucrătoare pentru o durată a contractului individual de muncă mai mică de 3 luni;
15 zile lucrătoare pentru o durată a contractului individual de muncă cuprinsă între 3 şi 6 luni;
30 de zile lucrătoare pentru o durată a contractului individual de muncă mai mare de 6 luni;
45 de zile lucrătoare în cazul salariaţilor încadraţi în funcţ i de conducere, pentru o durată a contractului individual de muncă mai mare de 6 luni.
Art. 86 - (1) Angajator i sunt obligaţi să informeze salariaţ i angajaţi cu contract individual de muncă pe durată determinată despre locurile de muncă vacante sau care vor deveni vacante, corespunzătoare pregătir i lor profesionale, şi să le asigure accesul la aceste locuri de muncă în condiţ i egale cu cele ale salariaţilor angajaţi cu contract individual de muncă pe perioadă nedeterminată. Această informare se face printr-un anunţ afişat la sediul angajatorului.
(2) O copie a anunţului prevăzut la alin. (1) se transmite de îndată sindicatului sau reprezentanţilor salariaţilor.
Art. 87 - (1) Referitor la condiţ ile de angajare şi de muncă, salariaţ i cu contract individual de muncă pe durată determinată nu vor fi trataţi mai puţin favorabil decât salariaţ i permanenţi comparabili, numai pe motivul duratei contractului individual de muncă, cu excepţia cazurilor în care tratamentul diferit este justificat de motive obiective.
(2) În sensul alin. (1), salariatul permanent comparabil reprezintă salariatul al cărui contract individual de muncă este încheiat pe durată nedeterminată şi care desfăşoară aceeaşi activitate sau una similară, în aceeaşi unitate, avându-se în vedere calificarea/aptitudinile profesionale.
(3) Atunci când nu există un salariat cu contract individual de muncă încheiat pe durată nedeterminată comparabil în aceeaşi unitate, se au în vedere dispoziţ ile din contractul colectiv de muncă aplicabil sau, în lipsa acestuia, reglementările legale în domeniu.

Cap. VII
Munca prin agent de muncă temporară

Art. 88 - (1) Munca prin agent de muncă temporară este munca prestată de un salariat temporar care a încheiat un contract de muncă temporară cu un agent de muncă temporară şi care este pus la dispoziţia utilizatorului pentru a lucra temporar sub supravegherea şi conducerea acestuia din urmă.
Salariatul temporar este persoana care a încheiat un contract de muncă temporară cu un agent de muncă temporară, în vederea puner i sale la dispoziţia unui utilizator pentru a lucra temporar sub supravegherea şi conducerea acestuia din urmă.
Agentul de muncă temporară este persoana juridică, autorizată de Ministerul Munc i, Familiei şi Protecţiei Sociale, care încheie contracte de muncă temporară cu salariaţi temporari, pentru a-i pune la dispoziţia utilizatorului, pentru a lucra pe perioada stabilită de contractul de punere la dispoziţie sub supravegherea şi conducerea acestuia. Condiţ ile de funcţionare a agentului de muncă temporară, precum şi procedura de autorizare se stabilesc prin hotărâre a Guvernului.
Utilizatorul este persoana fizică sau juridică pentru care şi sub supravegherea şi conducerea căreia

munceşte temporar un salariat temporar pus la dispoziţie de agentul de muncă temporară.
Misiunea de muncă temporară înseamnă acea perioadă în care salariatul temporar este pus la dispoziţia utilizatorului pentru a lucra temporar sub supravegherea şi conducerea acestuia, pentru executarea unei sarcini precise şi cu caracter temporar.
Art. 89 - Un utilizator poate apela la agenţi de muncă temporară pentru executarea unei sarcini precise şi cu caracter temporar, cu excepţia cazului prevăzut la art. 93.
Art. 90 - (1) Misiunea de muncă temporară se stabileşte pentru un termen care nu poate fi mai mare de 24 de luni.
Durata misiun i de muncă temporară poate fi prelungită pe perioade succesive care, adăugate la durata iniţială a misiun i, nu poate conduce la depăşirea unei perioade de 36 de luni.
Condiţ ile în care durata unei misiuni de muncă temporară poate fi prelungită sunt prevăzute în contractul de muncă temporară sau pot face obiectul unui act adiţional la acest contract.
Art. 91 - (1) Agentul de muncă temporară pune la dispoziţia utilizatorului un salariat angajat prin contract de muncă temporară, în baza unui contract de punere la dispoziţie încheiat în formă scrisă.
Contractul de punere la dispoziţie trebuie să cuprindă:
durata misiun i;
caracteristicile specifice postului, în special calificarea necesară, locul executăr i misiun i şi programul de lucru;
condiţ ile concrete de muncă;
echipamentele individuale de protecţie şi de muncă pe care salariatul temporar trebuie să le utilizeze;
orice alte servic i şi facilităţi în favoarea salariatului temporar;
valoarea comisionului de care beneficiază agentul de muncă temporară, precum şi remuneraţia la care are dreptul salariatul;
condiţ ile în care utilizatorul poate refuza un salariat temporar pus la dispoziţie de un agent de muncă temporară.
Orice clauză prin care se interzice angajarea de către utilizator a salariatului temporar după îndeplinirea misiun i este nulă.
Art. 92 - (1) Salariaţ i temporari au acces la toate servic ile şi facilităţile acordate de utilizator, în aceleaşi condiţ i ca şi ceilalţi salariaţi ai acestuia.
Utilizatorul este obligat să asigure salariatului temporar dotarea cu echipamente individuale de protecţie şi de muncă, cu excepţia situaţiei în care prin contractul de punere la dispoziţie dotarea este în sarcina agentului de muncă temporară.
Salariul primit de salariatul temporar pentru fiecare misiune nu poate fi inferior celui pe care îl primeşte salariatul utilizatorului, care prestează aceeaşi muncă sau una similară cu cea a salariatului temporar.
În măsura în care utilizatorul nu are angajat un astfel de salariat, salariul primit de salariatul temporar va fi stabilit luându-se în considerare salariul unei persoane angajate cu contract individual de muncă şi care prestează aceeaşi muncă sau una similară, astfel cum este stabilit prin contractul colectiv de muncă aplicabil la nivelul utilizatorului.
Art. 93 - Utilizatorul nu poate beneficia de servic ile salariatului temporar, dacă urmăreşte să înlocuiască astfel un salariat al său al cărui contract de muncă este suspendat ca urmare a participăr i la grevă.
Art. 94 - (1) Contractul de muncă temporară este un contract individual de muncă ce se încheie în scris între agentul de muncă temporară şi salariatul temporar, pe durata unei misiuni.
(2) În contractul de muncă temporară se precizează, în afara elementelor prevăzute la art. 17 şi art. 18 alin. (1), condiţ ile în care urmează să se desfăşoare misiunea, durata misiun i, identitatea şi sediul utilizatorului, precum şi cuantumul şi modalităţile remuneraţiei salariatului temporar.

Art. 95 - (1) Contractul de muncă temporară se poate încheia şi pentru mai multe misiuni, cu respectarea termenului prevăzut la art. 90 alin. (2).
Agentul de muncă temporară poate încheia cu salariatul temporar un contract de muncă pe durată nedeterminată, situaţie în care în perioada dintre două misiuni salariatul temporar se află la dispoziţia agentului de muncă temporară.
Pentru fiecare nouă misiune între părţi se încheie un contract de muncă temporară, în care vor fi precizate toate elementele prevăzute la art. 94 alin. (2).
Contractul de muncă temporară încetează la terminarea misiun i pentru care a fost încheiat sau dacă utilizatorul renunţă la servic ile sale înainte de încheierea misiun i, în condiţ ile contractului de punere la dispoziţie.
Art. 96 - (1) Pe toată durata misiun i salariatul temporar beneficiază de salariul plătit de agentul de muncă temporară.
Salariul primit de salariatul temporar pentru fiecare misiune se stabileşte prin negociere directă cu agentul de muncă temporară şi nu poate fi mai mic decât salariul minim brut pe ţară garantat în plată.
Agentul de muncă temporară este cel care reţine şi virează toate contribuţ ile şi impozitele datorate de salariatul temporar către bugetele statului şi plăteşte pentru acesta toate contribuţ ile datorate în condiţ ile leg i.
În cazul în care în termen de 15 zile calendaristice de la data la care obligaţ ile privind plata salariului şi cele privind contribuţ ile şi impozitele au devenit scadente şi exigibile, iar agentul de muncă temporară nu le execută, ele vor fi plătite de utilizator, în baza solicităr i salariatului temporar.
Utilizatorul care a plătit sumele datorate potrivit alin. (4) se subrogă, pentru sumele plătite, în drepturile salariatului temporar împotriva agentului de muncă temporară.
Art. 97 - Prin contractul de muncă temporară se poate stabili o perioadă de probă pentru realizarea misiun i, a cărei durată nu poate fi mai mare de:
două zile lucrătoare, în cazul în care contractul de muncă temporară este încheiat pentru o perioadă mai mică sau egală cu o lună;
5 zile lucrătoare, în cazul în care contractul de muncă temporară este încheiat pentru o perioadă cuprinsă între o lună şi 3 luni;
15 zile lucrătoare, în cazul în care contractul de muncă temporară este încheiat pentru o perioadă cuprinsă între 3 şi 6 luni;
20 de zile lucrătoare, în cazul în care contractul de muncă temporară este încheiat pentru o perioadă mai mare de 6 luni;
30 de zile lucrătoare, în cazul salariaţilor încadraţi în funcţ i de conducere, pentru o durată a contractului de muncă temporară mai mare de 6 luni.
Art. 98 - (1) Pe parcursul misiun i utilizatorul răspunde pentru asigurarea condiţ ilor de muncă pentru salariatul temporar, în conformitate cu legislaţia în vigoare.
(2) Utilizatorul va notifica de îndată agentului de muncă temporară orice accident de muncă sau îmbolnăvire profesională de care a luat cunoştinţă şi a cărei victimă a fost un salariat temporar pus la dispoziţie de agentul de muncă temporară.
Art. 99 - (1) La încetarea misiun i salariatul temporar poate încheia cu utilizatorul un contract individual de muncă.
(2) În cazul în care utilizatorul angajează, după o misiune, un salariat temporar, durata misiun i efectuate se ia în calcul la stabilirea drepturilor salariale, precum şi a celorlalte drepturi prevăzute de legislaţia munc i.
Art. 100 - Agentul de muncă temporară care concediază salariatul temporar înainte de termenul prevăzut în contractul de muncă temporară, pentru alte motive decât cele disciplinare, are obligaţia de a respecta reglementările legale privind încetarea contractului individual de muncă pentru motive care nu ţin de persoana salariatului.

Art. 101 - Cu excepţia dispoziţ ilor speciale contrare, prevăzute în prezentul capitol, dispoziţ ile legale, prevederile regulamentelor interne, precum şi cele ale contractelor colective de muncă aplicabile salariaţilor angajaţi cu contract individual de muncă pe durată nedeterminată la utilizator se aplică în egală măsură şi salariaţilor temporari pe durata misiun i la acesta.
Art. 102 - Agenţ i de muncă temporară nu percep nicio taxă salariaţilor temporari în schimbul demersurilor în vederea recrutăr i acestora de către utilizator sau pentru încheierea unui contract de muncă temporară.

Cap. VIII
Contractul individual de muncă cu timp parţial

Art. 103 - Salariatul cu fracţiune de normă este salariatul al cărui număr de ore normale de lucru, calculate săptămânal sau ca medie lunară, este inferior numărului de ore normale de lucru al unui salariat cu normă întreagă comparabil.
Art. 104 - (1) Angajatorul poate încadra salariaţi cu fracţiune de normă prin contracte individuale de muncă pe durată nedeterminată sau pe durată determinată, denumite contracte individuale de muncă cu timp parţial.
Contractul individual de muncă cu timp parţial se încheie numai în formă scrisă.
Salariatul comparabil este salariatul cu normă întreagă din aceeaşi unitate, care are acelaşi tip de contract individual de muncă, prestează aceeaşi activitate sau una similară cu cea a salariatului angajat cu contract individual de muncă cu timp parţial, avându-se în vedere şi alte considerente, cum ar fi vechimea în muncă şi calificarea/aptitudinile profesionale.
Atunci când nu există un salariat comparabil în aceeaşi unitate, se au în vedere dispoziţ ile din contractul colectiv de muncă aplicabil sau, în lipsa acestuia, reglementările legale în domeniu.
Art. 105 - (1) Contractul individual de muncă cu timp parţial cuprinde, în afara elementelor prevăzute la art.
17 alin. (3), următoarele:
durata munc i şi repartizarea programului de lucru;
condiţ ile în care se poate modifica programul de lucru;
interdicţia de a efectua ore suplimentare, cu excepţia cazurilor de forţă majoră sau pentru alte lucrări urgente destinate prevenir i producer i unor accidente ori înlăturăr i consecinţelor acestora.
(2) În situaţia în care într-un contract individual de muncă cu timp parţial nu sunt precizate elementele prevăzute la alin. (1), contractul se consideră a fi încheiat pentru normă întreagă.
Art. 106 - (1) Salariatul încadrat cu contract de muncă cu timp parţial se bucură de drepturile salariaţilor cu normă întreagă, în condiţ ile prevăzute de lege şi de contractele colective de muncă aplicabile.
(2) Drepturile salariale se acordă proporţional cu timpul efectiv lucrat, raportat la drepturile stabilite pentru programul normal de lucru.
Art. 107 - (1) Angajatorul este obligat ca, în măsura în care este posibil, să ia în considerare cererile salariaţilor de a se transfera fie de la un loc de muncă cu normă întreagă la unul cu fracţiune de normă, fie de la un loc de muncă cu fracţiune de normă la un loc de muncă cu normă întreagă sau de a-şi mări programul de lucru, în cazul în care apare această oportunitate.
Angajatorul este obligat să informeze la timp cu privire la apariţia unor locuri de muncă cu fracţiune de normă sau cu normă întreagă, pentru a facilita transferurile de la normă întreagă la fracţiune de normă şi invers. Această informare se face printr-un anunţ afişat la sediul angajatorului.
O copie a anunţului prevăzut la alin. (2) se transmite de îndată sindicatului sau reprezentanţilor salariaţilor.
Angajatorul asigură, în măsura în care este posibil, accesul la locuri de muncă cu fracţiune de normă la toate nivelurile.

Cap. IX
Munca la domiciliu

Art. 108 - (1) Sunt consideraţi salariaţi cu munca la domiciliu acei salariaţi care îndeplinesc, la domiciliul lor, atribuţ ile specifice funcţiei pe care o deţin.
În vederea îndeplinir i sarcinilor de serviciu ce le revin, salariaţ i cu munca la domiciliu îşi stabilesc singuri programul de lucru.
Angajatorul este în drept să verifice activitatea salariatului cu munca la domiciliu, în condiţ ile stabilite prin contractul individual de muncă.
Art. 109 - Contractul individual de muncă la domiciliu se încheie numai în formă scrisă şi conţine, în afara elementelor prevăzute la art. 17 alin. (3), următoarele:
precizarea expresă că salariatul lucrează la domiciliu;
programul în cadrul căruia angajatorul este în drept să controleze activitatea salariatului său şi modalitatea concretă de realizare a controlului;
obligaţia angajatorului de a asigura transportul la şi de la domiciliul salariatului, după caz, al mater ilor prime şi materialelor pe care le utilizează în activitate, precum şi al produselor finite pe care le realizează.
Art. 110 - (1) Salariatul cu munca la domiciliu se bucură de toate drepturile recunoscute prin lege şi prin contractele colective de muncă aplicabile salariaţilor al căror loc de muncă este la sediul angajatorului.
(2) Prin contractele colective de muncă şi/sau prin contractele individuale de muncă se pot stabili şi alte condiţ i specifice privind munca la domiciliu, în conformitate cu legislaţia în vigoare.

Titlul III
Timpul de muncă şi timpul de odihnă

Cap. I
Timpul de muncă

Secţiunea 1
Durata timpului de muncă

Art. 111 - Timpul de muncă reprezintă orice perioadă în care salariatul prestează munca, se află la dispoziţia angajatorului şi îndeplineşte sarcinile şi atribuţ ile sale, conform prevederilor contractului individual de muncă, contractului colectiv de muncă aplicabil şi/sau ale legislaţiei în vigoare.
Art. 112 - (1) Pentru salariaţ i angajaţi cu normă întreagă durata normală a timpului de muncă este de 8 ore pe zi şi de 40 de ore pe săptămână.
(2) În cazul tinerilor în vârstă de până la 18 ani durata timpului de muncă este de 6 ore pe zi şi de 30 de ore pe săptămână.
Art. 113 - (1) Repartizarea timpului de muncă în cadrul săptămân i este, de regulă, uniformă, de 8 ore pe zi timp de 5 zile, cu două zile de repaus.
(2) În funcţie de specificul unităţ i sau al munc i prestate, se poate opta şi pentru o repartizare inegală a timpului de muncă, cu respectarea duratei normale a timpului de muncă de 40 de ore pe săptămână.
Art. 114 - (1) Durata maximă legală a timpului de muncă nu poate depăşi 48 de ore pe săptămână, inclusiv orele suplimentare.
Prin excepţie, durata timpului de muncă, ce include şi orele suplimentare, poate fi prelungită peste 48 de

ore pe săptămână, cu condiţia ca media orelor de muncă, calculată pe o perioadă de referinţă de 4 luni calendaristice, să nu depăşească 48 de ore pe săptămână.
Pentru anumite activităţi sau profes i stabilite prin contractul colectiv de muncă aplicabil, se pot negocia, prin contractul colectiv de muncă respectiv, perioade de referinţă mai mari de 4 luni, dar care să nu depăşească 6 luni.
Sub rezerva respectăr i reglementărilor privind protecţia sănătăţ i şi securităţ i în muncă a salariaţilor, din motive obiective, tehnice sau privind organizarea munc i, contractele colective de muncă pot prevedea derogări de la durata perioadei de referinţă stabilite la alin. (3), dar pentru perioade de referinţă care în niciun caz să nu depăşească 12 luni.
La stabilirea perioadelor de referinţă prevăzute la alin. (2) - (4) nu se iau în calcul durata concediului de odihnă anual şi situaţ ile de suspendare a contractului individual de muncă.
Prevederile alin. (1) - (4) nu se aplică tinerilor care nu au împlinit vârsta de 18 ani.
Art. 115 - (1) Pentru anumite sectoare de activitate, unităţi sau profes i se poate stabili prin negocieri colective sau individuale ori prin acte normative specifice o durată zilnică a timpului de muncă mai mică sau mai mare de 8 ore.
(2) Durata zilnică a timpului de muncă de 12 ore va fi urmată de o perioadă de repaus de 24 de ore.
Art. 116 - (1) Modul concret de stabilire a programului de lucru inegal în cadrul săptămân i de lucru de 40 de ore, precum şi în cadrul săptămân i de lucru comprimate va fi negociat prin contractul colectiv de muncă la nivelul angajatorului sau, în absenţa acestuia, va fi prevăzut în regulamentul intern.
(2) Programul de lucru inegal poate funcţiona numai dacă este specificat expres în contractul individual de muncă.
Art. 117 - Programul de muncă şi modul de repartizare a acestuia pe zile sunt aduse la cunoştinţă salariaţilor şi sunt afişate la sediul angajatorului.
Art. 118 - (1) Angajatorul poate stabili programe individualizate de muncă, cu acordul sau la solicitarea salariatului în cauză.
Programele individualizate de muncă presupun un mod de organizare flexibil a timpului de muncă.
Durata zilnică a timpului de muncă este împărţită în două perioade: o perioadă fixă în care personalul se află simultan la locul de muncă şi o perioadă variabilă, mobilă, în care salariatul îşi alege orele de sosire şi de plecare, cu respectarea timpului de muncă zilnic.
Programul individualizat de muncă poate funcţiona numai cu respectarea dispoziţ ilor art. 112 şi 114.
Art. 119 - Angajatorul are obligaţia de a ţine evidenţa orelor de muncă prestate de fiecare salariat şi de a supune controlului inspecţiei munc i această evidenţă ori de câte ori este solicitat.

Secţiunea a 2-a Munca suplimentară

Art. 120 - (1) Munca prestată în afara duratei normale a timpului de muncă săptămânal, prevăzută la art. 112, este considerată muncă suplimentară.
(2) Munca suplimentară nu poate fi efectuată fără acordul salariatului, cu excepţia cazului de forţă majoră sau pentru lucrări urgente destinate prevenir i producer i unor accidente ori înlăturăr i consecinţelor unui accident.
Art. 121 - (1) La solicitarea angajatorului salariaţ i pot efectua muncă suplimentară, cu respectarea prevederilor art. 114 sau 115, după caz.
(2) Efectuarea munc i suplimentare peste limita stabilită potrivit prevederilor art. 114 sau 115, după caz, este interzisă, cu excepţia cazului de forţă majoră sau pentru alte lucrări urgente destinate prevenir i producer i unor accidente ori înlăturăr i consecinţelor unui accident.

Art. 122 - (1) Munca suplimentară se compensează prin ore libere plătite în următoarele 60 de zile calendaristice după efectuarea acesteia.
(2) În aceste condiţ i salariatul beneficiază de salariul corespunzător pentru orele prestate peste programul normal de lucru.
(3) În perioadele de reducere a activităţ i angajatorul are posibilitatea de a acorda zile libere plătite din care pot fi compensate orele suplimentare ce vor fi prestate în următoarele 12 luni.
Art. 123 - (1) În cazul în care compensarea prin ore libere plătite nu este posibilă în termenul prevăzut de art.
122 alin. (1) în luna următoare, munca suplimentară va fi plătită salariatului prin adăugarea unui spor la salariu corespunzător duratei acesteia.
(2) Sporul pentru munca suplimentară, acordat în condiţ ile prevăzute la alin. (1), se stabileşte prin negociere, în cadrul contractului colectiv de muncă sau, după caz, al contractului individual de muncă, şi nu poate fi mai mic de 75% din salariul de bază.
Art. 124 - Tiner i în vârstă de până la 18 ani nu pot presta muncă suplimentară.

Secţiunea a 3-a Munca de noapte

Art. 125 - (1) Munca prestată între orele 22,00 - 6,00 este considerată muncă de noapte.
Salariatul de noapte reprezintă, după caz:
salariatul care efectuează muncă de noapte cel puţin 3 ore din timpul său zilnic de lucru;
salariatul care efectuează muncă de noapte în proporţie de cel puţin 30% din timpul său lunar de lucru.
Durata normală a timpului de lucru, pentru salariatul de noapte, nu va depăşi o medie de 8 ore pe zi, calculată pe o perioadă de referinţă de maximum 3 luni calendaristice, cu respectarea prevederilor legale cu privire la repausul săptămânal.
Durata normală a timpului de lucru pentru salariaţ i de noapte a căror activitate se desfăşoară în condiţ i speciale sau deosebite de muncă nu va depăşi 8 ore pe parcursul oricărei perioade de 24 de ore decât în cazul în care majorarea acestei durate este prevăzută în contractul colectiv de muncă aplicabil şi numai în situaţia în care o astfel de prevedere nu contravine unor prevederi exprese stabilite în contractul colectiv de muncă încheiat la nivel superior.
În situaţia prevăzută la alin. (4), angajatorul este obligat să acorde perioade de repaus compensator i echivalente sau compensare în bani a orelor de noapte lucrate peste durata de 8 ore.
Angajatorul care, în mod frecvent, utilizează munca de noapte este obligat să informeze despre aceasta inspectoratul teritorial de muncă.
Art. 126 - Salariaţ i de noapte beneficiază:
fie de program de lucru redus cu o oră faţă de durata normală a zilei de muncă, pentru zilele în care efectuează cel puţin 3 ore de muncă de noapte, fără ca aceasta să ducă la scăderea salariului de bază;
fie de un spor pentru munca prestată în timpul nopţ i de 25% din salariul de bază, dacă timpul astfel lucrat reprezintă cel puţin 3 ore de noapte din timpul normal de lucru.
Art. 127 - (1) Salariaţ i care urmează să desfăşoare muncă de noapte în condiţ ile art. 125 alin. (2) sunt supuşi unui examen medical gratuit înainte de începerea activităţ i şi, după aceea, periodic.
(2) Condiţ ile de efectuare a examenului medical şi periodicitatea acestuia se stabilesc prin regulament aprobat prin ordin comun al ministrului munc i, familiei şi protecţiei sociale şi al ministrului sănătăţ i.
(3) Salariaţ i care desfăşoară muncă de noapte şi au probleme de sănătate recunoscute ca având legătură cu aceasta vor fi trecuţi la o muncă de zi pentru care sunt apţi.
Art. 128 - (1) Tiner i care nu au împlinit vârsta de 18 ani nu pot presta muncă de noapte.

(2) Femeile gravide, lăuzele şi cele care alăptează nu pot fi obligate să presteze muncă de noapte.

Secţiunea a 4-a Norma de muncă

Art. 129 - Norma de muncă exprimă cantitatea de muncă necesară pentru efectuarea operaţiunilor sau lucrărilor de către o persoană cu calificare corespunzătoare, care lucrează cu intensitate normală, în condiţ ile unor procese tehnologice şi de muncă determinate. Norma de muncă cuprinde timpul productiv, timpul pentru întreruperi impuse de desfăşurarea procesului tehnologic, timpul pentru pauze legale în cadrul programului de muncă.
Art. 130 - Norma de muncă se exprimă, în funcţie de caracteristicile procesului de producţie sau de alte activităţi ce se normează, sub formă de norme de timp, norme de producţie, norme de personal, sferă de atribuţ i sau sub alte forme corespunzătoare specificului fiecărei activităţi.
Art. 131 - Normarea munc i se aplică tuturor categor ilor de salariaţi.
Art. 132 - Normele de muncă se elaborează de către angajator, conform normativelor în vigoare, sau, în cazul în care nu există normative, normele de muncă se elaborează de către angajator după consultarea sindicatului reprezentativ ori, după caz, a reprezentanţilor salariaţilor.

Cap. II
Repausuri periodice
Art. 133 - Perioada de repaus reprezintă orice perioadă care nu este timp de muncă. Secţiunea 1
Pauza de masă şi repausul zilnic

Art. 134 - (1) În cazurile în care durata zilnică a timpului de muncă este mai mare de 6 ore, salariaţ i au dreptul la pauză de masă şi la alte pauze, în condiţ ile stabilite prin contractul colectiv de muncă aplicabil sau prin regulamentul intern.
(2) Tiner i în vârstă de până la 18 ani beneficiază de o pauză de masă de cel puţin 30 de minute, în cazul în care durata zilnică a timpului de muncă este mai mare de 4 ore şi jumătate.
(3) Pauzele, cu excepţia dispoziţ ilor contrare din contractul colectiv de muncă aplicabil şi din regulamentul intern, nu se vor include în durata zilnică normală a timpului de muncă.
Art. 135 - (1) Salariaţ i au dreptul între două zile de muncă la un repaus care nu poate fi mai mic de 12 ore consecutive.
(2) Prin excepţie, în cazul munc i în schimburi, acest repaus nu poate fi mai mic de 8 ore între schimburi.
Art. 136 - (1) Muncă în schimburi reprezintă orice mod de organizare a programului de lucru, potrivit căruia salariaţ i se succed unul pe altul la acelaşi post de muncă, potrivit unui anumit program, inclusiv program rotativ, şi care poate fi de tip continuu sau discontinuu, implicând pentru salariat necesitatea realizăr i unei activităţi în intervale orare diferite în raport cu o perioadă zilnică sau săptămânală, stabilită prin contractul individual de muncă.
(2) Salariat în schimburi reprezintă orice salariat al cărui program de lucru se înscrie în cadrul programului de muncă în schimburi.

Secţiunea a 2-a

Repausul săptămânal

Art. 137 - (1) Repausul săptămânal este de 48 de ore consecutive, de regulă sâmbăta şi duminica.
În cazul în care repausul în zilele de sâmbătă şi duminică ar prejudicia interesul public sau desfăşurarea normală a activităţ i, repausul săptămânal poate fi acordat şi în alte zile stabilite prin contractul colectiv de muncă aplicabil sau prin regulamentul intern.
În situaţia prevăzută la alin. (2) salariaţ i vor beneficia de un spor la salariu stabilit prin contractul colectiv de muncă sau, după caz, prin contractul individual de muncă.
În situaţ i de excepţie zilele de repaus săptămânal sunt acordate cumulat, după o perioadă de activitate continuă ce nu poate depăşi 14 zile calendaristice, cu autorizarea inspectoratului teritorial de muncă şi cu acordul sindicatului sau, după caz, al reprezentanţilor salariaţilor.
Salariaţ i al căror repaus săptămânal se acordă în condiţ ile alin. (4) au dreptul la dublul compensaţ ilor cuvenite potrivit art. 123 alin. (2).
Art. 138 - (1) În cazul unor lucrări urgente, a căror executare imediată este necesară pentru organizarea unor măsuri de salvare a persoanelor sau bunurilor angajatorului, pentru evitarea unor accidente iminente sau pentru înlăturarea efectelor pe care aceste accidente le-au produs asupra materialelor, instalaţ ilor sau clădirilor unităţ i, repausul săptămânal poate fi suspendat pentru personalul necesar în vederea executăr i acestor lucrări.
(2) Salariaţ i al căror repaus săptămânal a fost suspendat în condiţ ile alin. (1) au dreptul la dublul compensaţ ilor cuvenite potrivit art. 123 alin. (2).

Secţiunea a 3-a Sărbătorile legale

Art. 139 - (1) Zilele de sărbătoare legală în care nu se lucrează sunt:
1 şi 2 ianuarie;
prima şi a doua zi de Paşti;
1 mai;
prima şi a doua zi de Rusal i;
Adormirea Maic i Domnului;
30 noiembrie - Sfântul Apostol Andrei cel Întâi chemat, Ocrotitorul României;
1 decembrie;
prima şi a doua zi de Crăciun;
două zile pentru fiecare dintre cele 3 sărbători religioase anuale, declarate astfel de cultele religioase legale, altele decât cele creştine, pentru persoanele aparţinând acestora.
(2) Acordarea zilelor libere se face de către angajator.
Art. 140 - Prin hotărâre a Guvernului se vor stabili programe de lucru adecvate pentru unităţile sanitare şi pentru cele de alimentaţie publică, în scopul asigurăr i asistenţei sanitare şi, respectiv, al aprovizionăr i populaţiei cu produse alimentare de strictă necesitate, a căror aplicare este obligatorie.
Art. 141 - Prevederile art. 139 nu se aplică în locurile de muncă în care activitatea nu poate fi întreruptă datorită caracterului procesului de producţie sau specificului activităţ i.
Art. 142 - (1) Salariaţilor care lucrează în unităţile prevăzute la art. 140, precum şi la locurile de muncă prevăzute la art. 141 li se asigură compensarea cu timp liber corespunzător în următoarele 30 de zile.
(2) În cazul în care, din motive justificate, nu se acordă zile libere, salariaţ i beneficiază, pentru munca prestată în zilele de sărbătoare legală, de un spor la salariul de bază ce nu poate fi mai mic de 100% din salariul de bază corespunzător munc i prestate în programul normal de lucru.

Art. 143 - Prin contractul colectiv de muncă aplicabil se pot stabili şi alte zile libere.

Cap. III
Concediile

Secţiunea 1
Concediul de odihnă anual şi alte concedii ale salariaţilor

Art. 144 - (1) Dreptul la concediu de odihnă anual plătit este garantat tuturor salariaţilor.
(2) Dreptul la concediu de odihnă anual nu poate forma obiectul vreunei cesiuni, renunţări sau limitări. Art. 145 - (1) Durata minimă a concediului de odihnă anual este de 20 de zile lucrătoare.
Durata efectivă a concediului de odihnă anual se stabileşte în contractul individual de muncă, cu respectarea leg i şi a contractelor colective de muncă aplicabile.
Sărbătorile legale în care nu se lucrează, precum şi zilele libere plătite stabilite prin contractul colectiv de muncă aplicabil nu sunt incluse în durata concediului de odihnă anual.
La stabilirea duratei concediului de odihnă anual, perioadele de incapacitate temporară de muncă şi cele aferente concediului de maternitate, concediului de risc maternal şi concediului pentru îngrijirea copilului bolnav se consideră perioade de activitate prestată.
În situaţia în care incapacitatea temporară de muncă sau concediul de maternitate, concediul de risc maternal ori concediul pentru îngrijirea copilului bolnav a survenit în timpul efectuăr i concediului de odihnă anual, acesta se întrerupe, urmând ca salariatul să efectueze restul zilelor de concediu după ce a încetat situaţia de incapacitate temporară de muncă, de maternitate, de risc maternal ori cea de îngrijire a copilului bolnav, iar când nu este posibil urmează ca zilele neefectuate să fie reprogramate.
Salariatul are dreptul la concediu de odihnă anual şi în situaţia în care incapacitatea temporară de muncă se menţine, în condiţ ile leg i, pe întreaga perioadă a unui an calendaristic, angajatorul f ind obligat să acorde concediul de odihnă anual într-o perioadă de 18 luni începând cu anul următor celui în care acesta s-a aflat în concediu medical.
Art. 146 - (1) Concediul de odihnă se efectuează în fiecare an.
(2) În cazul în care salariatul, din motive justificate, nu poate efectua, integral sau parţial, concediul de odihnă anual la care avea dreptul în anul calendaristic respectiv, cu acordul persoanei în cauză, angajatorul este obligat să acorde concediul de odihnă neefectuat într-o perioadă de 18 luni începând cu anul următor celui în care s-a născut dreptul la concediul de odihnă anual.
(3) Compensarea în bani a concediului de odihnă neefectuat este permisă numai în cazul încetăr i contractului individual de muncă.
Art. 147 - (1) Salariaţ i care lucrează în condiţ i grele, periculoase sau vătămătoare, nevăzător i, alte persoane cu handicap şi tiner i în vârstă de până la 18 ani beneficiază de un concediu de odihnă suplimentar de cel puţin 3 zile lucrătoare.
(2) Numărul de zile lucrătoare aferent concediului de odihnă suplimentar pentru categor ile de salariaţi prevăzute la alin. (1) se stabileşte prin contractul colectiv de muncă aplicabil şi va fi de cel puţin 3 zile lucrătoare.
Art. 148 - (1) Efectuarea concediului de odihnă se realizează în baza unei programări colective sau individuale stabilite de angajator cu consultarea sindicatului sau, după caz, a reprezentanţilor salariaţilor, pentru programările colective, ori cu consultarea salariatului, pentru programările individuale. Programarea se face până la sfârşitul anului calendaristic pentru anul următor.
Prin programările colective se pot stabili perioade de concediu care nu pot fi mai mici de 3 luni pe categor i de personal sau locuri de muncă.

Prin programare individuală se poate stabili data efectuăr i concediului sau, după caz, perioada în care salariatul are dreptul de a efectua concediul, perioadă care nu poate fi mai mare de 3 luni.
În cadrul perioadelor de concediu stabilite conform alin. (2) şi (3) salariatul poate solicita efectuarea concediului cu cel puţin 60 de zile anterioare efectuăr i acestuia.
În cazul în care programarea conced ilor se face fracţionat, angajatorul este obligat să stabilească programarea astfel încât fiecare salariat să efectueze într-un an calendaristic cel puţin 10 zile lucrătoare de concediu neîntrerupt.
Art. 149 - Salariatul este obligat să efectueze în natură concediul de odihnă în perioada în care a fost programat, cu excepţia situaţ ilor expres prevăzute de lege sau atunci când, din motive obiective, concediul nu poate fi efectuat.
Art. 150 - (1) Pentru perioada concediului de odihnă salariatul beneficiază de o indemnizaţie de concediu, care nu poate fi mai mică decât salariul de bază, indemnizaţ ile şi sporurile cu caracter permanent cuvenite pentru perioada respectivă, prevăzute în contractul individual de muncă.
(2) Indemnizaţia de concediu de odihnă reprezintă media zilnică a drepturilor salariale prevăzute la alin. (1) din ultimele 3 luni anterioare celei în care este efectuat concediul, multiplicată cu numărul de zile de concediu.
(3) Indemnizaţia de concediu de odihnă se plăteşte de către angajator cu cel puţin 5 zile lucrătoare înainte de plecarea în concediu.
Art. 151 - (1) Concediul de odihnă poate fi întrerupt, la cererea salariatului, pentru motive obiective.
(2) Angajatorul poate rechema salariatul din concediul de odihnă în caz de forţă majoră sau pentru interese urgente care impun prezenţa salariatului la locul de muncă. În acest caz angajatorul are obligaţia de a suporta toate cheltuielile salariatului şi ale familiei sale, necesare în vederea revenir i la locul de muncă, precum şi eventualele prejudic i suferite de acesta ca urmare a întreruper i concediului de odihnă.
Art. 152 - (1) În cazul unor evenimente familiale deosebite, salariaţ i au dreptul la zile libere plătite, care nu se includ în durata concediului de odihnă.
(2) Evenimentele familiale deosebite şi numărul zilelor libere plătite sunt stabilite prin lege, prin contractul colectiv de muncă aplicabil sau prin regulamentul intern.
Art. 153 - (1) Pentru rezolvarea unor situaţ i personale salariaţ i au dreptul la conced i fără plată.
(2) Durata concediului fără plată se stabileşte prin contractul colectiv de muncă aplicabil sau prin regulamentul intern.

Secţiunea a 2-a
Concediile pentru formare profesională

Art. 154 - (1) Salariaţ i au dreptul să beneficieze, la cerere, de conced i pentru formare profesională.
(2) Conced ile pentru formare profesională se pot acorda cu sau fără plată.
Art. 155 - (1) Conced ile fără plată pentru formare profesională se acordă la solicitarea salariatului, pe perioada formăr i profesionale pe care salariatul o urmează din iniţiativa sa.
(2) Angajatorul poate respinge solicitarea salariatului numai dacă absenţa salariatului ar prejudicia grav desfăşurarea activităţ i.
Art. 156 - (1) Cererea de concediu fără plată pentru formare profesională trebuie să fie înaintată angajatorului cu cel puţin o lună înainte de efectuarea acestuia şi trebuie să precizeze data de începere a stagiului de formare profesională, domeniul şi durata acestuia, precum şi denumirea instituţiei de formare profesională.
(2) Efectuarea concediului fără plată pentru formare profesională se poate realiza şi fracţionat în cursul unui an calendaristic, pentru susţinerea examenelor de absolvire a unor forme de învăţământ sau pentru susţinerea examenelor de promovare în anul următor în cadrul instituţ ilor de învăţământ superior, cu respectarea condiţ ilor

stabilite la alin. (1).
Art. 157 - (1) În cazul în care angajatorul nu şi-a respectat obligaţia de a asigura pe cheltuiala sa participarea unui salariat la formare profesională în condiţ ile prevăzute de lege, salariatul are dreptul la un concediu pentru formare profesională, plătit de angajator, de până la 10 zile lucrătoare sau de până la 80 de ore.
(2) În situaţia prevăzută la alin. (1) indemnizaţia de concediu va fi stabilită conform art. 150.
(3) Perioada în care salariatul beneficiază de concediul plătit prevăzut la alin. (1) se stabileşte de comun acord cu angajatorul. Cererea de concediu plătit pentru formare profesională va fi înaintată angajatorului în condiţ ile prevăzute la art. 156 alin. (1).
Art. 158 - Durata concediului pentru formare profesională nu poate fi dedusă din durata concediului de odihnă anual şi este asimilată unei perioade de muncă efectivă în ceea ce priveşte drepturile cuvenite salariatului, altele decât salariul.

Titlul IV Salarizarea

Cap. I
Dispoziţii generale

Art. 159 - (1) Salariul reprezintă contraprestaţia munc i depuse de salariat în baza contractului individual de muncă.
(2) Pentru munca prestată în baza contractului individual de muncă fiecare salariat are dreptul la un salariu exprimat în bani.
(3) La stabilirea şi la acordarea salariului este interzisă orice discriminare pe criter i de sex, orientare sexuală, caracteristici genetice, vârstă, apartenenţă naţională, rasă, culoare, etnie, religie, opţiune politică, origine socială, handicap, situaţie sau responsabilitate familială, apartenenţă ori activitate sindicală.
Art. 160 - Salariul cuprinde salariul de bază, indemnizaţ ile, sporurile, precum şi alte adaosuri. Art. 161 - Salar ile se plătesc înaintea oricăror alte obligaţ i băneşti ale angajatorilor.
Art. 162 - (1) Nivelurile salariale minime se stabilesc prin contractele colective de muncă aplicabile.
(2) Salariul individual se stabileşte prin negocieri individuale între angajator şi salariat.
(3) Sistemul de salarizare a personalului din autorităţile şi instituţ ile publice finanţate integral sau în majoritate de la bugetul de stat, bugetul asigurărilor sociale de stat, bugetele locale şi bugetele fondurilor speciale se stabileşte prin lege, cu consultarea organizaţ ilor sindicale reprezentative.
Art. 163 - (1) Salariul este confidenţial, angajatorul având obligaţia de a lua măsurile necesare pentru asigurarea confidenţialităţ i.
(2) În scopul promovăr i intereselor şi apărăr i drepturilor salariaţilor, confidenţialitatea salar ilor nu poate fi opusă sindicatelor sau, după caz, reprezentanţilor salariaţilor, în strictă legătură cu interesele acestora şi în relaţia lor directă cu angajatorul.

Cap. II
Salariul de bază minim brut pe ţară garantat în plată

Art. 164 - (1) Salariul de bază minim brut pe ţară garantat în plată, corespunzător programului normal de muncă, se stabileşte prin hotărâre a Guvernului, după consultarea sindicatelor şi a patronatelor. În cazul în care programul normal de muncă este, potrivit leg i, mai mic de 8 ore zilnic, salariul de bază minim brut orar se calculează prin raportarea salariului de bază minim brut pe ţară la numărul mediu de ore lunar potrivit programului

legal de lucru aprobat.
Angajatorul nu poate negocia şi stabili salar i de bază prin contractul individual de muncă sub salariul de bază minim brut orar pe ţară.
Angajatorul este obligat să garanteze în plată un salariu brut lunar cel puţin egal cu salariul de bază minim brut pe ţară. Aceste dispoziţ i se aplică şi în cazul în care salariatul este prezent la lucru, în cadrul programului, dar nu poate să îşi desfăşoare activitatea din motive neimputabile acestuia, cu excepţia grevei.
Salariul de bază minim brut pe ţară garantat în plată este adus la cunoştinţa salariaţilor prin grija angajatorului.
Art. 165 - Pentru salariaţ i cărora angajatorul, conform contractului colectiv sau individual de muncă, le asigură hrană, cazare sau alte facilităţi, suma în bani cuvenită pentru munca prestată nu poate fi mai mică decât salariul minim brut pe ţară prevăzut de lege.

Cap. III
Plata salariului

Art. 166 - (1) Salariul se plăteşte în bani cel puţin o dată pe lună, la data stabilită în contractul individual de muncă, în contractul colectiv de muncă aplicabil sau în regulamentul intern, după caz.
Plata salariului se poate efectua prin virament într-un cont bancar.
Plata în natură a unei părţi din salariu, în condiţ ile stabilite la art. 165, este posibilă numai dacă este prevăzută expres în contractul colectiv de muncă aplicabil sau în contractul individual de muncă.
Întârzierea nejustificată a plăţ i salariului sau neplata acestuia poate determina obligarea angajatorului la plata de daune-interese pentru repararea prejudiciului produs salariatului.
Art. 167 - (1) Salariul se plăteşte direct titularului sau persoanei împuternicite de acesta.
(2) În caz de deces al salariatului, drepturile salariale datorate până la data decesului sunt plătite, în ordine, soţului supravieţuitor, cop ilor majori ai defunctului sau părinţilor acestuia. Dacă nu există niciuna dintre aceste categor i de persoane, drepturile salariale sunt plătite altor moştenitori, în condiţ ile dreptului comun.
Art. 168 - (1) Plata salariului se dovedeşte prin semnarea statelor de plată, precum şi prin orice alte documente justificative care demonstrează efectuarea plăţ i către salariatul îndreptăţit.
(2) Statele de plată, precum şi celelalte documente justificative se păstrează şi se arhivează de către angajator în aceleaşi condiţ i şi termene ca în cazul actelor contabile, conform leg i.
Art. 169 - (1) Nicio reţinere din salariu nu poate fi operată, în afara cazurilor şi condiţ ilor prevăzute de lege.
Reţinerile cu titlu de daune cauzate angajatorului nu pot fi efectuate decât dacă datoria salariatului este scadentă, lichidă şi exigibilă şi a fost constatată ca atare printr-o hotărâre judecătorească definitivă şi irevocabilă.
În cazul pluralităţ i de creditori ai salariatului va fi respectată următoarea ordine:
obligaţ ile de întreţinere, conform Codului familiei;
contribuţ ile şi impozitele datorate către stat;
daunele cauzate proprietăţ i publice prin fapte ilicite;
acoperirea altor dator i.
Reţinerile din salariu cumulate nu pot depăşi în fiecare lună jumătate din salariul net.
Art. 170 - Acceptarea fără rezerve a unei părţi din drepturile salariale sau semnarea actelor de plată în astfel de situaţ i nu poate avea semnificaţia unei renunţări din partea salariatului la drepturile salariale ce i se cuvin în integralitatea lor, potrivit dispoziţ ilor legale sau contractuale.
Art. 171 - (1) Dreptul la acţiune cu privire la drepturile salariale, precum şi cu privire la daunele rezultate din neexecutarea în totalitate sau în parte a obligaţ ilor privind plata salar ilor se prescrie în termen de 3 ani de la data la care drepturile respective erau datorate.

(2) Termenul de prescripţie prevăzut la alin. (1) este întrerupt în cazul în care intervine o recunoaştere din partea debitorului cu privire la drepturile salariale sau derivând din plata salariului.

Cap. IV
Fondul de garantare pentru plata creanţelor salariale

Art. 172 - Constituirea şi utilizarea fondului de garantare pentru plata creanţelor salariale se vor reglementa prin lege specială.

Cap. V
Protecţia drepturilor salariaţilor în cazul transferului întreprinderii, al unităţii sau al unor părţi ale acesteia

Art. 173 - (1) Salariaţ i beneficiază de protecţia drepturilor lor în cazul în care se produce un transfer al întreprinder i, al unităţ i sau al unor părţi ale acesteia către un alt angajator, potrivit leg i.
(2) Drepturile şi obligaţ ile cedentului, care decurg dintr-un contract sau raport de muncă existent la data transferului, vor fi transferate integral cesionarului.
(3) Transferul întreprinder i, al unităţ i sau al unor părţi ale acesteia nu poate constitui motiv de concediere individuală sau colectivă a salariaţilor de către cedent ori de către cesionar.
Art. 174 - Cedentul şi cesionarul au obligaţia de a informa şi de a consulta, anterior transferului, sindicatul sau, după caz, reprezentanţ i salariaţilor cu privire la implicaţ ile juridice, economice şi sociale asupra salariaţilor, decurgând din transferul dreptului de proprietate.

Titlul V
Sănătatea şi securitatea în muncă

Cap. I
Reguli generale

Art. 175 - (1) Angajatorul are obligaţia să asigure securitatea şi sănătatea salariaţilor în toate aspectele legate de muncă.
Dacă un angajator apelează la persoane sau servic i exterioare, aceasta nu îl exonerează de răspundere în acest domeniu.
Obligaţ ile salariaţilor în domeniul securităţ i şi sănătăţ i în muncă nu pot aduce atingere responsabilităţ i angajatorului.
Măsurile privind securitatea şi sănătatea în muncă nu pot să determine, în niciun caz, obligaţ i financiare pentru salariaţi.
Art. 176 - (1) Dispoziţ ile prezentului titlu se completează cu dispoziţ ile leg i speciale, ale contractelor colective de muncă aplicabile, precum şi cu normele şi normativele de protecţie a munc i.
(2) Normele şi normativele de protecţie a munc i pot stabili:
măsuri generale de protecţie a munc i pentru prevenirea accidentelor de muncă şi a bolilor profesionale, aplicabile tuturor angajatorilor;
măsuri de protecţie a munc i, specifice pentru anumite profes i sau anumite activităţi;
măsuri de protecţie specifice, aplicabile anumitor categor i de personal;
dispoziţ i referitoare la organizarea şi funcţionarea unor organisme speciale de asigurare a securităţ i şi

sănătăţ i în muncă.
Art. 177 - (1) În cadrul propr ilor responsabilităţi angajatorul va lua măsurile necesare pentru protejarea securităţ i şi sănătăţ i salariaţilor, inclusiv pentru activităţile de prevenire a riscurilor profesionale, de informare şi pregătire, precum şi pentru punerea în aplicare a organizăr i protecţiei munc i şi mijloacelor necesare acesteia.
(2) La adoptarea şi punerea în aplicare a măsurilor prevăzute la alin. (1) se va ţine seama de următoarele princip i generale de prevenire:
evitarea riscurilor;
evaluarea riscurilor care nu pot fi evitate;
combaterea riscurilor la sursă;
adaptarea munc i la om, în special în ceea ce priveşte proiectarea locurilor de muncă şi alegerea echipamentelor şi metodelor de muncă şi de producţie, în vederea atenuăr i, cu precădere, a munc i monotone şi a munc i repetitive, precum şi a reducer i efectelor acestora asupra sănătăţ i;
luarea în considerare a evoluţiei tehnic i;
înlocuirea a ceea ce este periculos cu ceea ce nu este periculos sau cu ceea ce este mai puţin periculos;
planificarea prevenir i;
adoptarea măsurilor de protecţie colectivă cu prioritate faţă de măsurile de protecţie individuală;
aducerea la cunoştinţa salariaţilor a instrucţiunilor corespunzătoare.
Art. 178 - (1) Angajatorul răspunde de organizarea activităţ i de asigurare a sănătăţ i şi securităţ i în muncă.
În cuprinsul regulamentelor interne sunt prevăzute în mod obligatoriu reguli privind securitatea şi sănătatea în muncă.
În elaborarea măsurilor de securitate şi sănătate în muncă angajatorul se consultă cu sindicatul sau, după caz, cu reprezentanţ i salariaţilor, precum şi cu comitetul de securitate şi sănătate în muncă.
Art. 179 - Angajatorul are obligaţia să asigure toţi salariaţ i pentru risc de accidente de muncă şi boli profesionale, în condiţ ile leg i.
Art. 180 - (1) Angajatorul are obligaţia să organizeze instruirea angajaţilor săi în domeniul securităţ i şi sănătăţ i în muncă.
Instruirea se realizează periodic, prin modalităţi specifice stabilite de comun acord de către angajator împreună cu comitetul de securitate şi sănătate în muncă şi cu sindicatul sau, după caz, cu reprezentanţ i salariaţilor.
Instruirea prevăzută la alin. (2) se realizează obligatoriu în cazul noilor angajaţi, al celor care îşi schimbă locul de muncă sau felul munc i şi al celor care îşi reiau activitatea după o întrerupere mai mare de 6 luni. În toate aceste cazuri instruirea se efectuează înainte de începerea efectivă a activităţ i.
Instruirea este obligatorie şi în situaţia în care intervin modificări ale legislaţiei în domeniu.
Art. 181 - (1) Locurile de muncă trebuie să fie organizate astfel încât să garanteze securitatea şi sănătatea salariaţilor.
(2) Angajatorul trebuie să organizeze controlul permanent al stăr i materialelor, utilajelor şi substanţelor folosite în procesul munc i, în scopul asigurăr i sănătăţ i şi securităţ i salariaţilor.
(3) Angajatorul răspunde pentru asigurarea condiţ ilor de acordare a primului ajutor în caz de accidente de muncă, pentru crearea condiţ ilor de preîntâmpinare a incend ilor, precum şi pentru evacuarea salariaţilor în situaţ i speciale şi în caz de pericol iminent.
Art. 182 - (1) Pentru asigurarea securităţ i şi sănătăţ i în muncă instituţia abilitată prin lege poate dispune limitarea sau interzicerea fabricăr i, comercializăr i, importului ori utilizăr i cu orice titlu a substanţelor şi preparatelor periculoase pentru salariaţi.
(2) Inspectorul de muncă poate, cu avizul medicului de medicină a munc i, să impună angajatorului să solicite organismelor competente, contra cost, analize şi expertize asupra unor produse, substanţe sau preparate

considerate a fi periculoase, pentru a cunoaşte compoziţia acestora şi efectele pe care le-ar putea produce asupra organismului uman.

Cap. II
Comitetul de securitate şi sănătate în muncă

Art. 183 - (1) La nivelul fiecărui angajator se constituie un comitet de securitate şi sănătate în muncă, cu scopul de a asigura implicarea salariaţilor în elaborarea şi aplicarea deciz ilor în domeniul protecţiei munc i.
(2) Comitetul de securitate şi sănătate în muncă se constituie în cadrul persoanelor juridice din sectorul public, privat şi cooperatist, inclusiv cu capital străin, care desfăşoară activităţi pe teritoriul României.
Art. 184 - (1) Comitetul de securitate şi sănătate în muncă se organizează la angajator i persoane juridice la care sunt încadraţi cel puţin 50 de salariaţi.
În cazul în care condiţ ile de muncă sunt grele, vătămătoare sau periculoase, inspectorul de muncă poate cere înf inţarea acestor comitete şi pentru angajator i la care sunt încadraţi mai puţin de 50 de salariaţi.
În cazul în care activitatea se desfăşoară în unităţi dispersate teritorial, se pot înf inţa mai multe comitete de securitate şi sănătate în muncă. Numărul acestora se stabileşte prin contractul colectiv de muncă aplicabil.
Comitetul de securitate şi sănătate în muncă coordonează măsurile de securitate şi sănătate în muncă şi în cazul activităţilor care se desfăşoară temporar, cu o durată mai mare de 3 luni.
În situaţia în care nu se impune constituirea comitetului de securitate şi sănătate în muncă, atribuţ ile specifice ale acestuia vor fi îndeplinite de responsabilul cu protecţia munc i numit de angajator.
Art. 185 - Componenţa, atribuţ ile specifice şi funcţionarea comitetului de securitate şi sănătate în muncă sunt reglementate prin hotărâre a Guvernului.

Cap. III
Protecţia salariaţilor prin servicii medicale

Art. 186 - Angajator i au obligaţia să asigure accesul salariaţilor la serviciul medical de medicină a munc i.
Art. 187 - (1) Serviciul medical de medicină a munc i poate fi un serviciu autonom organizat de angajator sau un serviciu asigurat de o asociaţie patronală.
(2) Durata munc i prestate de medicul de medicină a munc i se calculează în funcţie de numărul de salariaţi ai angajatorului, potrivit leg i.
Art. 188 - (1) Medicul de medicină a munc i este un salariat, atestat în profesia sa potrivit leg i, titular al unui contract de muncă încheiat cu un angajator sau cu o asociaţie patronală.
(2) Medicul de medicină a munc i este independent în exercitarea profesiei sale. Art. 189 - (1) Sarcinile principale ale medicului de medicină a munc i constau în:
prevenirea accidentelor de muncă şi a bolilor profesionale;
supravegherea efectivă a condiţ ilor de igienă şi sănătate în muncă;
asigurarea controlului medical al salariaţilor atât la angajarea în muncă, cât şi pe durata executăr i contractului individual de muncă.
(2) În vederea realizăr i sarcinilor ce îi revin medicul de medicină a munc i poate propune angajatorului schimbarea locului de muncă sau a felului munc i unor salariaţi, determinată de starea de sănătate a acestora.
(3) Medicul de medicină a munc i este membru de drept în comitetul de securitate şi sănătate în muncă.
Art. 190 - (1) Medicul de medicină a munc i stabileşte în fiecare an un program de activitate pentru îmbunătăţirea mediului de muncă din punct de vedere al sănătăţ i în muncă pentru fiecare angajator.
(2) Elementele programului sunt specifice pentru fiecare angajator şi sunt supuse avizăr i comitetului de

securitate şi sănătate în muncă.
Art. 191 - Prin lege specială vor fi reglementate atribuţ ile specifice, modul de organizare a activităţ i, organismele de control, precum şi statutul profesional specific al medicilor de medicină a munc i.

Titlul VI
Formarea profesională

Cap. I
Dispoziţii generale

Art. 192 - (1) Formarea profesională a salariaţilor are următoarele obiective principale:
adaptarea salariatului la cerinţele postului sau ale locului de muncă;
obţinerea unei calificări profesionale;
actualizarea cunoştinţelor şi deprinderilor specifice postului şi locului de muncă şi perfecţionarea pregătir i profesionale pentru ocupaţia de bază;
reconversia profesională determinată de restructurări socioeconomice;
dobândirea unor cunoştinţe avansate, a unor metode şi procedee moderne, necesare pentru realizarea activităţilor profesionale;
prevenirea riscului şomajului;
promovarea în muncă şi dezvoltarea carierei profesionale.
(2) Formarea profesională şi evaluarea cunoştinţelor se fac pe baza standardelor ocupaţionale. Art. 193 - Formarea profesională a salariaţilor se poate realiza prin următoarele forme:
participarea la cursuri organizate de către angajator sau de către furnizor i de servic i de formare profesională din ţară ori din străinătate;
stag i de adaptare profesională la cerinţele postului şi ale locului de muncă;
stag i de practică şi specializare în ţară şi în străinătate;
ucenicie organizată la locul de muncă;
formare individualizată;
alte forme de pregătire convenite între angajator şi salariat.
Art. 194 - (1) Angajator i au obligaţia de a asigura participarea la programe de formare profesională pentru toţi salariaţ i, după cum urmează:
cel puţin o dată la 2 ani, dacă au cel puţin 21 de salariaţi;
cel puţin o dată la 3 ani, dacă au sub 21 de salariaţi.
(2) Cheltuielile cu participarea la programele de formare profesională, asigurată în condiţ ile alin. (1), se suportă de către angajatori.
Art. 195 - (1) Angajatorul persoană juridică care are mai mult de 20 de salariaţi elaborează anual şi aplică planuri de formare profesională, cu consultarea sindicatului sau, după caz, a reprezentanţilor salariaţilor.
(2) Planul de formare profesională elaborat conform prevederilor alin. (1) devine anexă la contractul colectiv de muncă încheiat la nivel de unitate.
(3) Salariaţ i au dreptul să fie informaţi cu privire la conţinutul planului de formare profesională.
Art. 196 - (1) Participarea la formarea profesională poate avea loc la iniţiativa angajatorului sau la iniţiativa salariatului.
(2) Modalitatea concretă de formare profesională, drepturile şi obligaţ ile părţilor, durata formăr i profesionale, precum şi orice alte aspecte legate de formarea profesională, inclusiv obligaţ ile contractuale ale salariatului în raport cu angajatorul care a suportat cheltuielile ocazionate de formarea profesională, se stabilesc prin acordul

părţilor şi fac obiectul unor acte adiţionale la contractele individuale de muncă.
Art. 197 - (1) În cazul în care participarea la cursurile sau stag ile de formare profesională este iniţiată de angajator, toate cheltuielile ocazionate de această participare sunt suportate de către acesta.
(2) Pe perioada participăr i la cursurile sau stag ile de formare profesională conform alin. (1), salariatul va beneficia, pe toată durata formăr i profesionale, de toate drepturile salariale deţinute.
(3) Pe perioada participăr i la cursurile sau stag ile de formare profesională conform alin. (1), salariatul beneficiază de vechime la acel loc de muncă, această perioadă f ind considerată stagiu de cotizare în sistemul asigurărilor sociale de stat.
Art. 198 - (1) Salariaţ i care au beneficiat de un curs sau un stagiu de formare profesională, în condiţ ile art. 197 alin. (1), nu pot avea iniţiativa încetăr i contractului individual de muncă pentru o perioadă stabilită prin act adiţional.
Durata obligaţiei salariatului de a presta muncă în favoarea angajatorului care a suportat cheltuielile ocazionate de formarea profesională, precum şi orice alte aspecte în legătură cu obligaţ ile salariatului, ulterioare formăr i profesionale, se stabilesc prin act adiţional la contractul individual de muncă.
Nerespectarea de către salariat a dispoziţiei prevăzute la alin. (1) determină obligarea acestuia la suportarea tuturor cheltuielilor ocazionate de pregătirea sa profesională, proporţional cu perioada nelucrată din perioada stabilită conform actului adiţional la contractul individual de muncă.
Obligaţia prevăzută la alin. (3) revine şi salariaţilor care au fost concediaţi în perioada stabilită prin actul adiţional, pentru motive disciplinare, sau al căror contract individual de muncă a încetat ca urmare a arestăr i preventive pentru o perioadă mai mare de 60 de zile, a condamnăr i printr-o hotărâre judecătorească definitivă pentru o infracţiune în legătură cu munca lor, precum şi în cazul în care instanţa penală a pronunţat interdicţia de exercitare a profesiei, temporar sau definitiv.
Art. 199 - (1) În cazul în care salariatul este cel care are iniţiativa participăr i la o formă de pregătire profesională cu scoatere din activitate, angajatorul va analiza solicitarea salariatului împreună cu sindicatul sau, după caz, cu reprezentanţ i salariaţilor.
(2) Angajatorul va decide cu privire la cererea formulată de salariat potrivit alin. (1), în termen de 15 zile de la primirea solicităr i. Totodată angajatorul va decide cu privire la condiţ ile în care va permite salariatului participarea la forma de pregătire profesională, inclusiv dacă va suporta în totalitate sau în parte costul ocazionat de aceasta.
Art. 200 - Salariaţ i care au încheiat un act adiţional la contractul individual de muncă cu privire la formarea profesională pot primi în afara salariului corespunzător locului de muncă şi alte avantaje în natură pentru formarea profesională.

Cap. II
Contracte speciale de formare profesională organizată de angajator

Art. 201 - Sunt considerate contracte speciale de formare profesională contractul de calificare profesională şi contractul de adaptare profesională.
Art. 202 - (1) Contractul de calificare profesională este cel în baza căruia salariatul se obligă să urmeze cursurile de formare organizate de angajator pentru dobândirea unei calificări profesionale.
(2) Pot încheia contracte de calificare profesională salariaţ i cu vârsta minimă de 16 ani împliniţi, care nu au dobândit o calificare sau au dobândit o calificare ce nu le permite menţinerea locului de muncă la acel angajator.
(3) Contractul de calificare profesională se încheie pentru o durată cuprinsă între 6 luni şi 2 ani.
Art. 203 - (1) Pot încheia contracte de calificare profesională numai angajator i autorizaţi în acest sens de Ministerul Munc i, Familiei şi Protecţiei Sociale şi de Ministerul Educaţiei, Cercetăr i, Tineretului şi Sportului.

(2) Procedura de autorizare, precum şi modul de atestare a calificăr i profesionale se stabilesc prin lege specială.
Art. 204 - (1) Contractul de adaptare profesională se încheie în vederea adaptăr i salariaţilor debutanţi la o funcţie nouă, la un loc de muncă nou sau în cadrul unui colectiv nou.
(2) Contractul de adaptare profesională se încheie odată cu încheierea contractului individual de muncă sau, după caz, la debutul salariatului în funcţia nouă, la locul de muncă nou sau în colectivul nou, în condiţ ile leg i.
Art. 205 - (1) Contractul de adaptare profesională este un contract încheiat pe durată determinată, ce nu poate fi mai mare de un an.
(2) La expirarea termenului contractului de adaptare profesională salariatul poate fi supus unei evaluări în vederea stabilir i măsur i în care acesta poate face faţă funcţiei noi, locului de muncă nou sau colectivului nou în care urmează să presteze munca.
Art. 206 - (1) Formarea profesională la nivelul angajatorului prin intermediul contractelor speciale se face de către un formator.
Formatorul este numit de angajator dintre salariaţ i calificaţi, cu o experienţă profesională de cel puţin 2 ani în domeniul în care urmează să se realizeze formarea profesională.
Un formator poate asigura formarea, în acelaşi timp, pentru cel mult 3 salariaţi.
Exercitarea activităţ i de formare profesională se include în programul normal de lucru al formatorului.
Art. 207 - (1) Formatorul are obligaţia de a primi, de a ajuta, de a informa şi de a îndruma salariatul pe durata contractului special de formare profesională şi de a supraveghea îndeplinirea atribuţ ilor de serviciu corespunzătoare postului ocupat de salariatul în formare.
(2) Formatorul asigură cooperarea cu alte organisme de formare şi participă la evaluarea salariatului care a beneficiat de formare profesională.

Cap. III
Contractul de ucenicie la locul de muncă

Art. 208 - (1) Ucenicia la locul de muncă se organizează în baza contractului de ucenicie.
(2) Contractul de ucenicie la locul de muncă este contractul individual de muncă de tip particular, în temeiul căruia:
angajatorul persoană juridică sau persoană fizică se obligă ca, în afara plăţ i unui salariu, să asigure formarea profesională a ucenicului într-o meserie potrivit domeniului său de activitate;
ucenicul se obligă să se formeze profesional şi să muncească în subordinea angajatorului respectiv.
(3) Contractul de ucenicie la locul de muncă se încheie pe durată determinată.
Art. 209 - (1) Persoana încadrată în muncă în baza unui contract de ucenicie are statut de ucenic.
(2) Ucenicul beneficiază de dispoziţ ile aplicabile celorlalţi salariaţi, în măsura în care ele nu sunt contrare celor specifice statutului său.
Art. 210 - Organizarea, desfăşurarea şi controlul activităţ i de ucenicie se reglementează prin lege specială.

Titlul VII Dialogul social

Cap. I
Dispoziţii generale

Art. 211 - Pentru asigurarea climatului de stabilitate şi pace socială, prin lege sunt reglementate modalităţile de

consultări şi dialog permanent între partener i sociali.
Art. 212 - (1) Consiliul Economic şi Social este instituţie publică de interes naţional, tripartită, autonomă, constituită în scopul realizăr i dialogului tripartit la nivel naţional.
(2) Organizarea şi funcţionarea Consiliului Economic şi Social se stabilesc prin lege specială.
Art. 213 - În cadrul ministerelor şi prefecturilor funcţionează, în condiţ ile leg i, comis i de dialog social, cu caracter consultativ, între administraţia publică, sindicate şi patronat.

Cap. II Sindicatele

Art. 214 - (1) Sindicatele, federaţ ile şi confederaţ ile sindicale, denumite în continuare organizaţii sindicale, sunt constituite de către salariaţi pe baza dreptului de liberă asociere, în scopul promovăr i intereselor lor profesionale, economice şi sociale, precum şi al apărăr i drepturilor individuale şi colective ale acestora prevăzute în contractele colective şi individuale de muncă sau în acordurile colective de muncă şi raporturile de serviciu, precum şi în legislaţia naţională, în pactele, tratatele şi convenţ ile internaţionale la care România este parte.
(2) Constituirea, organizarea şi funcţionarea sindicatelor se reglementează prin lege.
Art. 215 - Sindicatele participă prin reprezentanţ i propr i, în condiţ ile leg i, la negocierea şi încheierea contractelor colective de muncă, la tratative sau acorduri cu autorităţile publice şi cu patronatele, precum şi în structurile specifice dialogului social.
Art. 216 - Sindicatele se pot asocia în mod liber, în condiţ ile leg i, în federaţ i, confederaţ i sau uniuni teritoriale.
Art. 217 - Exerciţiul dreptului sindical al salariaţilor este recunoscut la nivelul tuturor angajatorilor, cu respectarea drepturilor şi libertăţilor garantate prin Constituţie şi în conformitate cu dispoziţ ile prezentului cod şi ale legilor speciale.
Art. 218 - (1) Este interzisă orice intervenţie a autorităţilor publice de natură a limita drepturile sindicale sau a împiedica exercitarea lor legală.
(2) Este interzis, de asemenea, orice act de ingerinţă al patronilor sau al organizaţ ilor patronale, fie direct, fie prin reprezentanţ i sau membr i lor, în constituirea organizaţ ilor sindicale sau în exercitarea drepturilor lor.
Art. 219 - La cererea membrilor lor, sindicatele pot să îi reprezinte pe aceştia în cadrul conflictelor de muncă, în condiţ ile leg i.
Art. 220 - (1) Reprezentanţilor aleşi în organele de conducere ale sindicatelor li se asigură protecţia leg i contra oricăror forme de condiţionare, constrângere sau limitare a exercităr i funcţ ilor lor.
(2) Pe toată durata exercităr i mandatului, reprezentanţ i aleşi în organele de conducere ale sindicatelor nu pot fi concediaţi pentru motive ce ţin de îndeplinirea mandatului pe care l-au primit de la salariaţ i din unitate.
(3) Alte măsuri de protecţie a celor aleşi în organele de conducere ale sindicatelor sunt prevăzute în legi speciale şi în contractul colectiv de muncă aplicabil.

Cap. III
Reprezentanţii salariaţilor

Art. 221 - (1) La angajator i la care sunt încadraţi mai mult de 20 de salariaţi şi la care nu sunt constituite organizaţ i sindicale reprezentative conform leg i, interesele salariaţilor pot fi promovate şi apărate de reprezentanţ i lor, aleşi şi mandataţi special în acest scop.
(2) Reprezentanţ i salariaţilor sunt aleşi în cadrul adunăr i generale a salariaţilor, cu votul a cel puţin jumătate

din numărul total al salariaţilor.
(3) Reprezentanţ i salariaţilor nu pot să desfăşoare activităţi ce sunt recunoscute prin lege exclusiv sindicatelor. Art. 222 - (1) Pot fi aleşi ca reprezentanţi ai salariaţilor salariaţ i care au capacitate deplină de exerciţiu.
Numărul de reprezentanţi aleşi ai salariaţilor se stabileşte de comun acord cu angajatorul, în raport cu numărul de salariaţi ai acestuia.
Durata mandatului reprezentanţilor salariaţilor nu poate fi mai mare de 2 ani. Art. 223 - Reprezentanţ i salariaţilor au următoarele atribuţ i principale:
să urmărească respectarea drepturilor salariaţilor, în conformitate cu legislaţia în vigoare, cu contractul colectiv de muncă aplicabil, cu contractele individuale de muncă şi cu regulamentul intern;
să participe la elaborarea regulamentului intern;
să promoveze interesele salariaţilor referitoare la salariu, condiţ i de muncă, timp de muncă şi timp de odihnă, stabilitate în muncă, precum şi orice alte interese profesionale, economice şi sociale legate de relaţ ile de muncă;
să sesizeze inspectoratul de muncă cu privire la nerespectarea dispoziţ ilor legale şi ale contractului colectiv de muncă aplicabil;
să negocieze contractul colectiv de muncă, în condiţ ile leg i.
Art. 224 - Atribuţ ile reprezentanţilor salariaţilor, modul de îndeplinire a acestora, precum şi durata şi limitele mandatului lor se stabilesc în cadrul adunăr i generale a salariaţilor, în condiţ ile leg i.
Art. 225 - Numărul de ore în cadrul programului normal de lucru pentru reprezentanţ i salariaţilor destinat în vederea îndeplinir i mandatului pe care l-au primit se stabileşte prin contractul colectiv de muncă aplicabil sau, în lipsa acestuia, prin negociere directă cu conducerea unităţ i.
Art. 226 - Pe toată durata exercităr i mandatului, reprezentanţ i salariaţilor nu pot fi concediaţi pentru motive ce ţin de îndeplinirea mandatului pe care l-au primit de la salariaţi.

Cap. IV Patronatul

Art. 227 - (1) Patronatele, denumite şi organizaţii de angajatori, constituite în condiţ ile leg i, sunt organizaţ i ale angajatorilor, autonome, fără caracter politic, înf inţate ca persoane juridice de drept privat, fără scop patrimonial.
(2) Angajator i se pot asocia în federaţ i şi/sau confederaţ i ori alte structuri asociative, conform leg i.
Art. 228 - Constituirea, organizarea şi funcţionarea patronatelor, precum şi exercitarea drepturilor şi obligaţ ilor acestora sunt reglementate prin lege specială.

Titlul VIII
Contractele colective de muncă

Art. 229 - (1) Contractul colectiv de muncă este convenţia încheiată în formă scrisă între angajator sau organizaţia patronală, de o parte, şi salariaţi, reprezentaţi prin sindicate ori în alt mod prevăzut de lege, de cealaltă parte, prin care se stabilesc clauze privind condiţ ile de muncă, salarizarea, precum şi alte drepturi şi obligaţ i ce decurg din raporturile de muncă.
Negocierea colectivă la nivel de unitate este obligatorie, cu excepţia cazului în care angajatorul are încadraţi mai puţin de 21 de salariaţi.
La negocierea clauzelor şi la încheierea contractelor colective de muncă părţile sunt egale şi libere.
Contractele colective de muncă, încheiate cu respectarea dispoziţ ilor legale, constituie legea părţilor.

Art. 230 - Părţile, reprezentarea acestora, precum şi procedura de negociere şi de încheiere a contractelor colective de muncă sunt stabilite potrivit leg i.

Titlul IX
Conflictele de muncă

Cap. I
Dispoziţii generale

Art. 231 - Prin conflicte de muncă se înţelege conflictele dintre salariaţi şi angajatori privind interesele cu caracter economic, profesional sau social ori drepturile rezultate din desfăşurarea raporturilor de muncă.
Art. 232 - Procedura de soluţionare a conflictelor de muncă se stabileşte prin lege specială.

Cap. II Greva

Art. 233 - Salariaţ i au dreptul la grevă pentru apărarea intereselor profesionale, economice şi sociale. Art. 234 - (1) Greva reprezintă încetarea voluntară şi colectivă a lucrului de către salariaţi.
Participarea salariaţilor la grevă este liberă. Niciun salariat nu poate fi constrâns să participe sau să nu participe la o grevă.
Limitarea sau interzicerea dreptului la grevă poate interveni numai în cazurile şi pentru categor ile de salariaţi prevăzute expres de lege.
Art. 235 - Participarea la grevă, precum şi organizarea acesteia cu respectarea leg i nu reprezintă o încălcare a obligaţ ilor salariaţilor şi nu pot avea drept consecinţă sancţionarea disciplinară a salariaţilor grevişti sau a organizatorilor grevei.
Art. 236 - Modul de exercitare a dreptului de grevă, organizarea, declanşarea şi desfăşurarea grevei, procedurile prealabile declanşăr i grevei, suspendarea şi încetarea grevei, precum şi orice alte aspecte legate de grevă se reglementează prin lege specială.

Titlul X
Agenţia Naţională pentru Inspecţia Muncii şi Securitate Socială

Art. 237 - Aplicarea reglementărilor generale şi speciale în domeniul relaţ ilor de muncă, securităţ i şi sănătăţ i în muncă este supusă controlului Agenţiei Naţionale pentru Inspecţia Munc i şi Securitate Socială, ca organism specializat al administraţiei publice centrale, cu personalitate juridică, în subordinea Ministerului Munc i, Familiei şi Protecţiei Sociale.
Art. 238 - Agenţia Naţională pentru Inspecţia Munc i şi Securitate Socială are în subordine inspectoratele teritoriale de muncă, organizate în fiecare judeţ şi în municipiul Bucureşti.
Art. 239 - Înf inţarea şi organizarea Agenţiei Naţionale pentru Inspecţia Munc i şi Securitate Socială sunt reglementate prin lege specială.
Art. 240 - Prin derogare de la prevederile art. 3 alin. (2) din Legea nr. 252/2003 privind registrul unic de control, în cazul controalelor care au ca obiectiv depistarea munc i fără forme legale, inspector i de muncă vor completa registrul unic de control după efectuarea controlului.

Titlul XI

Răspunderea juridică

Cap. I Regulamentul intern

Art. 241 - Regulamentul intern se întocmeşte de către angajator, cu consultarea sindicatului sau a reprezentanţilor salariaţilor, după caz.
Art. 242 - Regulamentul intern cuprinde cel puţin următoarele categor i de dispoziţ i:
reguli privind protecţia, igiena şi securitatea în muncă în cadrul unităţ i;
reguli privind respectarea principiului nediscriminăr i şi al înlăturăr i oricărei forme de încălcare a demnităţ i;
drepturile şi obligaţ ile angajatorului şi ale salariaţilor;
procedura de soluţionare a cererilor sau a reclamaţ ilor individuale ale salariaţilor;
reguli concrete privind disciplina munc i în unitate;
abaterile disciplinare şi sancţiunile aplicabile;
reguli referitoare la procedura disciplinară;
modalităţile de aplicare a altor dispoziţ i legale sau contractuale specifice;
criter ile şi procedurile de evaluare profesională a salariaţilor.
Art. 243 - (1) Regulamentul intern se aduce la cunoştinţa salariaţilor prin grija angajatorului şi îşi produce efectele faţă de salariaţi din momentul încunoştinţăr i acestora.
Obligaţia de informare a salariaţilor cu privire la conţinutul regulamentului intern trebuie îndeplinită de angajator.
Modul concret de informare a fiecărui salariat cu privire la conţinutul regulamentului intern se stabileşte prin contractul colectiv de muncă aplicabil sau, după caz, prin conţinutul regulamentului intern.
Regulamentul intern se afişează la sediul angajatorului.
Art. 244 - Orice modificare ce intervine în conţinutul regulamentului intern este supusă procedurilor de informare prevăzute la art. 243.
Art. 245 - (1) Orice salariat interesat poate sesiza angajatorul cu privire la dispoziţ ile regulamentului intern, în măsura în care face dovada încălcăr i unui drept al său.
(2) Controlul legalităţ i dispoziţ ilor cuprinse în regulamentul intern este de competenţa instanţelor judecătoreşti, care pot fi sesizate în termen de 30 de zile de la data comunicăr i de către angajator a modului de soluţionare a sesizăr i formulate potrivit alin. (1).
Art. 246 - (1) Întocmirea regulamentului intern la nivelul fiecărui angajator se realizează în termen de 60 de zile de la data intrăr i în vigoare a prezentului cod.
(2) În cazul angajatorilor înf inţaţi după intrarea în vigoare a prezentului cod, termenul de 60 de zile prevăzut la alin. (1) începe să curgă de la data dobândir i personalităţ i juridice.

Cap. II
Răspunderea disciplinară

Art. 247 - (1) Angajatorul dispune de prerogativă disciplinară, având dreptul de a aplica, potrivit leg i, sancţiuni disciplinare salariaţilor săi ori de câte ori constată că aceştia au săvârşit o abatere disciplinară.
(2) Abaterea disciplinară este o faptă în legătură cu munca şi care constă într-o acţiune sau inacţiune săvârşită cu vinovăţie de către salariat, prin care acesta a încălcat normele legale, regulamentul intern, contractul individual de muncă sau contractul colectiv de muncă aplicabil, ordinele şi dispoziţ ile legale ale conducătorilor ierarhici.
Art. 248 - (1) Sancţiunile disciplinare pe care le poate aplica angajatorul în cazul în care salariatul săvârşeşte o

abatere disciplinară sunt:
avertismentul scris;
retrogradarea din funcţie, cu acordarea salariului corespunzător funcţiei în care s-a dispus retrogradarea, pentru o durată ce nu poate depăşi 60 de zile;
reducerea salariului de bază pe o durată de 1 - 3 luni cu 5 - 10%;
reducerea salariului de bază şi/sau, după caz, şi a indemnizaţiei de conducere pe o perioadă de 1 - 3 luni cu 5 - 10%;
desfacerea disciplinară a contractului individual de muncă.
(2) În cazul în care, prin statute profesionale aprobate prin lege specială, se stabileşte un alt regim sancţionator, va fi aplicat acesta.
(3) Sancţiunea disciplinară se radiază de drept în termen de 12 luni de la aplicare, dacă salariatului nu i se aplică o nouă sancţiune disciplinară în acest termen. Radierea sancţiunilor disciplinare se constată prin decizie a angajatorului emisă în formă scrisă.
Art. 249 - (1) Amenzile disciplinare sunt interzise.
(2) Pentru aceeaşi abatere disciplinară se poate aplica numai o singură sancţiune.
Art. 250 - Angajatorul stabileşte sancţiunea disciplinară aplicabilă în raport cu gravitatea abater i disciplinare săvârşite de salariat, avându-se în vedere următoarele:
împrejurările în care fapta a fost săvârşită;
gradul de vinovăţie a salariatului;
consecinţele abater i disciplinare;
comportarea generală în serviciu a salariatului;
eventualele sancţiuni disciplinare suferite anterior de către acesta.
Art. 251 - (1) Sub sancţiunea nulităţ i absolute, nicio măsură, cu excepţia celei prevăzute la art. 248 alin. (1) lit. a), nu poate fi dispusă mai înainte de efectuarea unei cercetări disciplinare prealabile.
În vederea desfăşurăr i cercetăr i disciplinare prealabile, salariatul va fi convocat în scris de persoana împuternicită de către angajator să realizeze cercetarea, precizându-se obiectul, data, ora şi locul întreveder i.
Neprezentarea salariatului la convocarea făcută în condiţ ile prevăzute la alin. (2) fără un motiv obiectiv dă dreptul angajatorului să dispună sancţionarea, fără efectuarea cercetăr i disciplinare prealabile.
În cursul cercetăr i disciplinare prealabile salariatul are dreptul să formuleze şi să susţină toate apărările în favoarea sa şi să ofere persoanei împuternicite să realizeze cercetarea toate probele şi motivaţ ile pe care le consideră necesare, precum şi dreptul să fie asistat, la cererea sa, de către un avocat sau de către un reprezentant al sindicatului al cărui membru este.
Art. 252 - (1) Angajatorul dispune aplicarea sancţiun i disciplinare printr-o decizie emisă în formă scrisă, în termen de 30 de zile calendaristice de la data luăr i la cunoştinţă despre săvârşirea abater i disciplinare, dar nu mai târziu de 6 luni de la data săvârşir i faptei.
Sub sancţiunea nulităţ i absolute, în decizie se cuprind în mod obligatoriu:
descrierea faptei care constituie abatere disciplinară;
precizarea prevederilor din statutul de personal, regulamentul intern, contractul individual de muncă sau contractul colectiv de muncă aplicabil care au fost încălcate de salariat;
motivele pentru care au fost înlăturate apărările formulate de salariat în timpul cercetăr i disciplinare prealabile sau motivele pentru care, în condiţ ile prevăzute la art. 251 alin. (3), nu a fost efectuată cercetarea;
temeiul de drept în baza căruia sancţiunea disciplinară se aplică;
termenul în care sancţiunea poate fi contestată;
instanţa competentă la care sancţiunea poate fi contestată.
Decizia de sancţionare se comunică salariatului în cel mult 5 zile calendaristice de la data emiter i şi

produce efecte de la data comunicăr i.
Comunicarea se predă personal salariatului, cu semnătură de primire, ori, în caz de refuz al primir i, prin scrisoare recomandată, la domiciliul sau reşedinţa comunicată de acesta.
Decizia de sancţionare poate fi contestată de salariat la instanţele judecătoreşti competente în termen de 30 de zile calendaristice de la data comunicăr i.

Cap. III
Răspunderea patrimonială

Art. 253 - (1) Angajatorul este obligat, în temeiul normelor şi princip ilor răspunder i civile contractuale, să îl despăgubească pe salariat în situaţia în care acesta a suferit un prejudiciu material sau moral din culpa angajatorului în timpul îndeplinir i obligaţ ilor de serviciu sau în legătură cu serviciul.
În cazul în care angajatorul refuză să îl despăgubească pe salariat, acesta se poate adresa cu plângere instanţelor judecătoreşti competente.
Angajatorul care a plătit despăgubirea îşi va recupera suma aferentă de la salariatul vinovat de producerea pagubei, în condiţ ile art. 254 şi următoarele.
Art. 254 - (1) Salariaţ i răspund patrimonial, în temeiul normelor şi princip ilor răspunder i civile contractuale, pentru pagubele materiale produse angajatorului din vina şi în legătură cu munca lor.
Salariaţ i nu răspund de pagubele provocate de forţa majoră sau de alte cauze neprevăzute care nu puteau fi înlăturate şi nici de pagubele care se încadrează în riscul normal al serviciului.
În situaţia în care angajatorul constată că salariatul său a provocat o pagubă din vina şi în legătură cu munca sa, va putea solicita salariatului, printr-o notă de constatare şi evaluare a pagubei, recuperarea contravalor i acesteia, prin acordul părţilor, într-un termen care nu va putea fi mai mic de 30 de zile de la data comunicăr i.
Contravaloarea pagubei recuperate prin acordul părţilor, conform alin. (3), nu poate fi mai mare decât echivalentul a 5 salar i minime brute pe economie.
Art. 255 - (1) Când paguba a fost produsă de mai mulţi salariaţi, cuantumul răspunder i fiecăruia se stabileşte în raport cu măsura în care a contribuit la producerea ei.
(2) Dacă măsura în care s-a contribuit la producerea pagubei nu poate fi determinată, răspunderea fiecăruia se stabileşte proporţional cu salariul său net de la data constatăr i pagubei şi, atunci când este cazul, şi în funcţie de timpul efectiv lucrat de la ultimul său inventar.
Art. 256 - (1) Salariatul care a încasat de la angajator o sumă nedatorată este obligat să o restituie.
(2) Dacă salariatul a primit bunuri care nu i se cuveneau şi care nu mai pot fi restituite în natură sau dacă acestuia i s-au prestat servic i la care nu era îndreptăţit, este obligat să suporte contravaloarea lor. Contravaloarea bunurilor sau servic ilor în cauză se stabileşte potrivit valor i acestora de la data plăţ i.
Art. 257 - (1) Suma stabilită pentru acoperirea daunelor se reţine în rate lunare din drepturile salariale care se cuvin persoanei în cauză din partea angajatorului la care este încadrată în muncă.
(2) Ratele nu pot fi mai mari de o treime din salariul lunar net, fără a putea depăşi împreună cu celelalte reţineri pe care le-ar avea cel în cauză jumătate din salariul respectiv.
Art. 258 - (1) În cazul în care contractul individual de muncă încetează înainte ca salariatul să îl fi despăgubit pe angajator şi cel în cauză se încadrează la un alt angajator ori devine funcţionar public, reţinerile din salariu se fac de către noul angajator sau noua instituţie ori autoritate publică, după caz, pe baza titlului executoriu transmis în acest scop de către angajatorul păgubit.
(2) Dacă persoana în cauză nu s-a încadrat în muncă la un alt angajator, în temeiul unui contract individual de muncă ori ca funcţionar public, acoperirea daunei se va face prin urmărirea bunurilor sale, în condiţ ile Codului de

procedură civilă.
Art. 259 - În cazul în care acoperirea prejudiciului prin reţineri lunare din salariu nu se poate face într-un termen de maximum 3 ani de la data la care s-a efectuat prima rată de reţineri, angajatorul se poate adresa executorului judecătoresc în condiţ ile Codului de procedură civilă.

Cap. IV
Răspunderea contravenţională

Art. 260 - (1) Constituie contravenţie şi se sancţionează astfel următoarele fapte:
nerespectarea dispoziţ ilor privind garantarea în plată a salariului minim brut pe ţară, cu amendă de la 300 lei la 2.000 lei;
încălcarea de către angajator a prevederilor art. 34 alin. (5), cu amendă de la 300 lei la 1.000 lei;
împiedicarea sau obligarea, prin ameninţări ori prin violenţe, a unui salariat sau a unui grup de salariaţi să participe la grevă ori să muncească în timpul grevei, cu amendă de la 1.500 lei la 3.000 lei;
stipularea în contractul individual de muncă a unor clauze contrare dispoziţ ilor legale, cu amendă de la
2.000 lei la 5.000 lei;
primirea la muncă a până la 5 persoane fără încheierea unui contract individual de muncă, potrivit art. 16 alin. (1), cu amendă de la 10.000 lei la 20.000 lei pentru fiecare persoană identificată;
prestarea munc i de către o persoană fără încheierea unui contract individual de muncă, cu amendă de la 500 lei la 1.000 lei;
încălcarea de către angajator a prevederilor art. 139 şi 142, cu amendă de la 5.000 lei la 10.000 lei;
încălcarea obligaţiei prevăzute la art. 140, cu amendă de la 5.000 lei la 20.000 lei;
nerespectarea dispoziţ ilor privind munca suplimentară, cu amendă de la 1.500 lei la 3.000 lei;
nerespectarea prevederilor legale privind acordarea repausului săptămânal, cu amendă de la 1.500 lei la
3.000 lei;
neacordarea indemnizaţiei prevăzute la art. 53 alin. (1), în cazul în care angajatorul îşi întrerupe temporar activitatea cu menţinerea raporturilor de muncă, cu amendă de la 1.500 lei la 5.000 lei;
încălcarea prevederilor legale referitoare la munca de noapte, cu amendă de la 1.500 lei la 3.000 lei;
încălcarea de către angajator a obligaţiei prevăzute la art. 27 şi 119, cu amendă de la 1.500 lei la 3.000 lei;
nerespectarea prevederilor legale privind înregistrarea de către angajator a demisiei, cu amendă de la 1.500 lei la 3.000 lei;
încălcarea de către agentul de muncă temporară a obligaţiei prevăzute la art. 102, cu amendă de la 5.000 lei la 10.000 lei, pentru fiecare persoană identificată, fără a depăşi valoarea cumulată de 100.000 lei;
încălcarea prevederilor art. 16 alin. (3), cu amendă de la 1.500 lei la 2.000 lei.
Constatarea contravenţ ilor şi aplicarea sancţiunilor se fac de către inspector i de muncă.
Contravenţ ilor prevăzute la alin. (1) li se aplică dispoziţ ile legislaţiei în vigoare.

Cap. V Răspunderea penală

Art. 261 - 263 *** Abrogate prin L. nr. 187/2012
Art. 264 - (1) Constituie infracţiune şi se pedepseşte cu închisoare de la o lună la un an sau cu amendă penală fapta persoanei care, în mod repetat, stabileşte pentru salariaţ i încadraţi în baza contractului individual de muncă salar i sub nivelul salariului minim brut pe ţară garantat în plată, prevăzut de lege.
Cu pedeapsa prevăzută la alin. (1) se sancţionează şi infracţiunea constând în refuzul nejustificat al unei

persoane de a prezenta organelor competente documentele legale, în scopul împiedicăr i verificărilor privitoare la aplicarea reglementărilor generale şi speciale în domeniul relaţ ilor de muncă, securităţ i şi sănătăţ i în muncă, în termen de cel mult 15 zile de la primirea celei de-a doua solicitări.
Cu pedeapsa prevăzută la alin. (1) se sancţionează şi infracţiunea constând în împiedicarea sub orice formă a organelor competente de a intra, în condiţ ile prevăzute de lege, în sed i, incinte, spaţ i, terenuri sau mijloace de transport pe care angajatorul le foloseşte în realizarea activităţ i lui profesionale, pentru a efectua verificări privitoare la aplicarea reglementărilor generale şi speciale în domeniul relaţ ilor de muncă, securităţ i şi sănătăţ i în muncă.
Constituie infracţiune şi se sancţionează cu închisoare de la 3 luni la 2 ani sau cu amendă primirea la muncă a mai mult de 5 persoane, indiferent de cetăţenia acestora, fără încheierea unui contract individual de muncă.
Art. 265 - (1) Încadrarea în muncă a unui minor cu nerespectarea condiţ ilor legale de vârstă sau folosirea acestuia pentru prestarea unor activităţi cu încălcarea prevederilor legale referitoare la regimul de muncă al minorilor constituie infracţiune şi se pedepseşte cu închisoare de la 3 luni la 2 ani sau cu amendă.
Cu pedeapsa prevăzută la art. 264 alin. (4) se sancţionează primirea la muncă a unei persoane aflate în situaţie de şedere ilegală în România, cunoscând că aceasta este victimă a traficului de persoane.
Dacă munca prestată de persoanele prevăzute la alin. (2) sau la art. 264 alin. (4) este de natură să le pună în pericol viaţa, integritatea sau sănătatea, pedeapsa este închisoarea de la 6 luni la 3 ani.
În cazul săvârşir i uneia dintre infracţiunile prevăzute la alin. (2) şi (3) şi la art. 264 alin. (4), instanţa de judecată poate dispune şi aplicarea uneia sau mai multora dintre următoarele pedepse complementare:
pierderea totală sau parţială a dreptului angajatorului de a beneficia de prestaţ i, ajutoare ori subvenţ i publice, inclusiv fonduri ale Uniun i Europene gestionate de autorităţile române, pentru o perioadă de până la 5 ani;
interzicerea dreptului angajatorului de a participa la atribuirea unui contract de achiziţ i publice pentru o perioadă de până la 5 ani;
recuperarea integrală sau parţială a prestaţ ilor, ajutoarelor ori subvenţ ilor publice, inclusiv fonduri ale Uniun i Europene gestionate de autorităţile române, atribuite angajatorului pe o perioadă de până la 12 luni înainte de comiterea infracţiun i;
închiderea temporară sau definitivă a punctului ori a punctelor de lucru în care s-a comis infracţiunea sau retragerea temporară ori definitivă a unei licenţe de desfăşurare a activităţ i profesionale în cauză, dacă acest lucru este justificat de gravitatea încălcăr i.
În cazul săvârşir i uneia dintre infracţiunile prevăzute la alin. (2) şi (3) şi la art. 264 alin. (4), angajatorul va fi obligat să plătească sumele reprezentând:
orice remuneraţie restantă datorată persoanelor angajate ilegal. Cuantumul remuneraţiei se presupune a fi egal cu salariul mediu brut pe economie, cu excepţia cazului în care fie angajatorul, fie angajatul poate dovedi contrariul;
cuantumul tuturor impozitelor, taxelor şi contribuţ ilor de asigurări sociale pe care angajatorul le-ar fi plătit dacă persoana ar fi fost angajată legal, inclusiv penalităţile de întârziere şi amenzile administrative corespunzătoare;
cheltuielile determinate de transferul plăţilor restante în ţara în care persoana angajată ilegal s-a întors de bunăvoie sau a fost returnată în condiţ ile leg i.
În cazul săvârşir i uneia dintre infracţiunile prevăzute la alin. (2) şi (3) şi la art. 264 alin. (4) de către un subcontractant, atât contractantul principal, cât şi orice subcontractant intermediar, dacă au avut cunoştinţă de faptul că subcontractantul angajator angaja străini aflaţi în situaţie de şedere ilegală, pot fi obligaţi de către instanţă, în solidar cu angajatorul sau în locul subcontractantului angajator ori al contractantului al cărui subcontractant direct este angajatorul, la plata sumelor de bani prevăzute la alin. (5) lit. a) şi c).

Titlul XII Jurisdicţia muncii

Cap. I
Dispoziţii generale

Art. 266 - Jurisdicţia muncii are ca obiect soluţionarea conflictelor de muncă cu privire la încheierea, executarea, modificarea, suspendarea şi încetarea contractelor individuale sau, după caz, colective de muncă prevăzute de prezentul cod, precum şi a cererilor privind raporturile juridice dintre partener i sociali, stabilite potrivit prezentului cod.
Art. 267 - Pot fi părţi în conflictele de muncă:
salariaţ i, precum şi orice altă persoană titulară a unui drept sau a unei obligaţ i în temeiul prezentului cod, al altor legi sau al contractelor colective de muncă;
angajator i - persoane fizice şi/sau persoane juridice -, agenţ i de muncă temporară, utilizator i, precum şi orice altă persoană care beneficiază de o muncă desfăşurată în condiţ ile prezentului cod;
sindicatele şi patronatele;
alte persoane juridice sau fizice care au această vocaţie în temeiul legilor speciale sau al Codului de procedură civilă.
Art. 268 - (1) Cererile în vederea soluţionăr i unui conflict de muncă pot fi formulate:
în termen de 30 de zile calendaristice de la data în care a fost comunicată decizia unilaterală a angajatorului referitoare la încheierea, executarea, modificarea, suspendarea sau încetarea contractului individual de muncă;
în termen de 30 de zile calendaristice de la data în care s-a comunicat decizia de sancţionare disciplinară;
în termen de 3 ani de la data naşter i dreptului la acţiune, în situaţia în care obiectul conflictului individual de muncă constă în plata unor drepturi salariale neacordate sau a unor despăgubiri către salariat, precum şi în cazul răspunder i patrimoniale a salariaţilor faţă de angajator;
pe toată durata existenţei contractului, în cazul în care se solicită constatarea nulităţ i unui contract individual sau colectiv de muncă ori a unor clauze ale acestuia;
în termen de 6 luni de la data naşter i dreptului la acţiune, în cazul neexecutăr i contractului colectiv de muncă ori a unor clauze ale acestuia.
(2) În toate situaţ ile, altele decât cele prevăzute la alin. (1), termenul este de 3 ani de la data naşter i dreptului.

Cap. II
Competenţa materială şi teritorială

Art. 269 - (1) Judecarea conflictelor de muncă este de competenţa instanţelor judecătoreşti, stabilite potrivit leg i.
(2) Cererile referitoare la cauzele prevăzute la alin. (1) se adresează instanţei competente în a cărei circumscripţie reclamantul îşi are domiciliul sau reşedinţa ori, după caz, sediul.
(3) Dacă sunt îndeplinite condiţ ile prevăzute de Codul de procedură civilă pentru coparticiparea procesuală activă, cererea poate fi formulată la instanţa competentă pentru oricare dintre reclamanţi.

Cap. III
Reguli speciale de procedură

Art. 270 - Cauzele prevăzute la art. 266 sunt scutite de taxa judiciară de timbru şi de timbrul judiciar. Art. 271 - (1) Cererile referitoare la soluţionarea conflictelor de muncă se judecă în regim de urgenţă.
(2) Termenele de judecată nu pot fi mai mari de 15 zile.
(3) Procedura de citare a părţilor se consideră legal îndeplinită dacă se realizează cu cel puţin 24 de ore înainte de termenul de judecată.
Art. 272 - Sarcina probei în conflictele de muncă revine angajatorului, acesta f ind obligat să depună dovezile în apărarea sa până la prima zi de înfăţişare.
Art. 273 - Administrarea probelor se face cu respectarea regimului de urgenţă, instanţa f ind în drept să decadă din beneficiul probei admise partea care întârzie în mod nejustificat administrarea acesteia.
Art. 274 - Hotărârile pronunţate în fond sunt definitive şi executor i de drept.
Art. 275 - Dispoziţ ile prezentului titlu se completează cu prevederile Codului de procedură civilă.

Titlul XIII
Dispoziţii tranzitorii şi finale

Art. 276 - Potrivit obligaţ ilor internaţionale asumate de România, legislaţia muncii va fi armonizată permanent cu normele Uniun i Europene, cu convenţ ile şi recomandările Organizaţiei Internaţionale a Munc i, cu normele dreptului internaţional al munc i.
Art. 277 - (1) În sensul prezentului cod, funcţ ile de conducere sunt cele definite prin lege sau prin reglementări interne ale angajatorului.
(2) Prezenta lege transpune art. 16 lit. b), art. 18 şi 19 din Directiva 2003/88/CE a Parlamentului European şi a Consiliului din 4 noiembrie 2003 privind anumite aspecte ale organizăr i timpului de lucru, publicată în Jurnalul Oficial al Uniun i Europene, seria L, nr. 299 din 18 noiembrie 2003, şi art. 3, 4 şi 10 din Directiva 2008/104/CE a Parlamentului European şi a Consiliului din 19 noiembrie 2008 privind munca prin agent de muncă temporară, publicată în Jurnalul Oficial al Uniun i Europene, seria L, nr. 327 din 5 decembrie 2008.
Art. 278 - (1) Dispoziţ ile prezentului cod se întregesc cu celelalte dispoziţ i cuprinse în legislaţia muncii şi, în măsura în care nu sunt incompatibile cu specificul raporturilor de muncă prevăzute de prezentul cod, cu dispoziţ ile legislaţiei civile.
(2) Prevederile prezentului cod se aplică cu titlu de drept comun şi acelor raporturi juridice de muncă neîntemeiate pe un contract individual de muncă, în măsura în care reglementările speciale nu sunt complete şi aplicarea lor nu este incompatibilă cu specificul raporturilor de muncă respective.
Art. 279 - (1) Vechimea în muncă stabilită până la data de 31 decembrie 2010 se probează cu carnetul de muncă.
După data abrogăr i Decretului nr. 92/1976 privind carnetul de muncă, cu modificările ulterioare, vechimea în muncă stabilită până la data de 31 decembrie 2010 se reconstituie, la cererea persoanei care nu posedă carnet de muncă, de către instanţa judecătorească competentă să soluţioneze conflictele de muncă, pe baza înscrisurilor sau a altor probe din care să rezulte existenţa raporturilor de muncă. Cererile de reconstituire formulate anterior datei abrogăr i Decretului nr. 92/1976, cu modificările ulterioare, se vor soluţiona potrivit dispoziţ ilor acestui act normativ.
Angajator i care păstrează şi completează carnetele de muncă le vor elibera titularilor în mod eşalonat, până la data de 30 iunie 2011, pe bază de proces-verbal individual de predare-primire.
Inspectoratele teritoriale de muncă ce deţin carnetele de muncă ale salariaţilor le vor elibera până la data prevăzută la alin. (3), în condiţ ile stabilite prin ordin al ministrului muncii, familiei şi protecţiei sociale.
Anunţul privind pierderea carnetelor de muncă emise în temeiul Decretului nr. 92/1976, cu modificările ulterioare, se publică în Monitorul Oficial al României, Partea a III-a.

Art. 280 - Pe data intrăr i în vigoare a prezentului cod cauzele privind conflicte de muncă aflate pe rolul tribunalelor se judecă în continuare potrivit dispoziţ ilor procesuale aplicabile la data sesizăr i instanţelor.
Art. 281 - (1) Prezentul cod intră în vigoare la data de 1 martie 2003.
Pe data intrăr i în vigoare a prezentului cod se abrogă:
Codul munc i al R.S.R., Legea nr. 10/1972, publicată în Buletinul Oficial, Partea I, nr. 140 din 1 decembrie 1972, cu modificările şi completările ulterioare;
Legea nr. 1/1970 - Legea organizăr i şi disciplinei muncii în unităţile socialiste de stat, publicată în Buletinul Oficial, Partea I, nr. 27 din 27 martie 1970, cu modificările şi completările ulterioare;
Decretul nr. 63/1981 privind modul de recuperare a unor pagube aduse avutului obştesc, publicat în Buletinul Oficial, Partea I, nr. 17 din 25 martie 1981;
Legea nr. 30/1990 privind angajarea salariaţilor în funcţie de competenţă, publicată în Monitorul Oficial al României, Partea I, nr. 125 din 16 noiembrie 1990;
Legea nr. 2/1991 privind cumulul de funcţ i, publicată în Monitorul Oficial al României, Partea I, nr. 1 din 8 ianuarie 1991;
Legea salarizăr i nr. 14/1991, publicată în Monitorul Oficial al României, Partea I, nr. 32 din 9 februarie 1991, cu modificările şi completările ulterioare;
Legea nr. 6/1992 privind concediul de odihnă şi alte conced i ale salariaţilor, publicată în Monitorul Oficial al României, Partea I, nr. 16 din 10 februarie 1992;
Legea nr. 68/1993 privind garantarea în plată a salariului minim, publicată în Monitorul Oficial al României, Partea I, nr. 246 din 15 octombrie 1993;
Legea nr. 75/1996 privind stabilirea zilelor de sărbătoare legală în care nu se lucrează, publicată în Monitorul Oficial al României, Partea I, nr. 150 din 17 iulie 1996, cu modificările şi completările ulterioare;
art. 34 şi 35 din Legea nr. 130/1996 privind contractul colectiv de muncă, republicată în Monitorul Oficial al României, Partea I, nr. 184 din 19 mai 1998.
Pe data de 1 ianuarie 2011 se abrogă dispoziţ ile Decretului nr. 92/1976 privind carnetul de muncă, publicat în Buletinul Oficial, Partea I, nr. 37 din 26 aprilie 1976, cu modificările ulterioare.

NOTĂ:
Reproducem mai jos prevederile art. II, III şi IV din Legea nr. 40/2011 pentru modificarea şi completarea Leg i nr. 53/2003 - Codul muncii, care nu sunt încorporate în forma republicată a Leg i nr. 53/2003 - Codul muncii şi care se aplică, în continuare, ca dispoziţ i propr i ale actului modificator:
"Art. II - (1) Contractele colective de muncă şi actele adiţionale încheiate în intervalul de la data intrăr i în vigoare a prezentei legi şi până la 31 decembrie 2011 nu pot prevedea o durată de valabilitate care să depăşească 31 decembrie 2011. După această dată, contractele colective de muncă şi actele adiţionale se vor încheia pe durate stabilite prin legea specială.
(2) Contractele colective de muncă în aplicare la data intrăr i în vigoare a prezentei legi îşi produc efectele până la data expirăr i termenului pentru care au fost încheiate.
Art. III - La data intrăr i în vigoare a prezentei legi se abrogă:
art. 23 alin. (1) din Legea nr. 130/1996 privind contractul colectiv de muncă, republicată în Monitorul Oficial al României, Partea I, nr. 184 din 19 mai 1998, cu modificările şi completările ulterioare;
art. 72 din Legea nr. 168/1999 privind soluţionarea conflictelor de muncă, publicată în Monitorul Oficial al României, Partea I, nr. 582 din 29 noiembrie 1999, cu modificările şi completările ulterioare.
Art. IV - Prezenta lege intră în vigoare la 30 de zile de la data publicăr i în Monitorul Oficial al României, Partea I."
"

    Asigură-te că fiecare răspuns furnizat include următoarele elemente esențiale: 
    
    Context clar și concis: Explică exact la ce aspecte ale Codului muncii se referă răspunsul tău, menționând jurisprudența, părțile implicate, termenii-cheie și orice alte detalii relevante.
    Citate specifice din Codul muncii: La finalul fiecărui răspuns, include o citare completă a articolului sau articolelor relevante din Codul muncii pentru a sprijini informațiile oferite.
    Explicarea incertitudinilor: În cazurile în care răspunsul implică un grad de incertitudine, oferă detalii despre articolele care pot fi relevante și explică raționamentul din spatele interpretării tale.
    Procent de încredere în răspuns: Indică un procent de încredere pentru fiecare răspuns, bazat pe complexitatea și claritatea întrebării inițiale.
    Sugestii de prompturi suplimentare: La finalul fiecărui răspuns, oferă sugestii de prompturi care ar putea ajuta la clarificarea ulterioară a subiectului discutat sau la explorarea altor aspecte relevante.
    
    Respectarea limitelor AI: Evită să presupui că AI-ul va înțelege sau va face deducții din informațiile incomplete. Dacă există modificări legislative recente care pot influența răspunsul, menționează acest lucru și indică unde pot fi găsite aceste modificări.`,
    messages: [
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name
      }))
    ],
    text: ({ content, done, delta }) => {
      if (!textStream) {
        textStream = createStreamableValue('')
        textNode = <BotMessage content={textStream.value} />
      }

      if (done) {
        textStream.done()
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'assistant',
              content
            }
          ]
        })
      } else {
        textStream.update(delta)
      }

      return textNode
    },
    tools: {
      listStocks: {
        description: 'List three imaginary stocks that are trending.',
        parameters: z.object({
          stocks: z.array(
            z.object({
              symbol: z.string().describe('The symbol of the stock'),
              price: z.number().describe('The price of the stock'),
              delta: z.number().describe('The change in price of the stock')
            })
          )
        }),
        generate: async function* ({ stocks }) {
          yield (
            <BotCard>
              <StocksSkeleton />
            </BotCard>
          )

          await sleep(1000)

          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'listStocks',
                    toolCallId,
                    args: { stocks }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'listStocks',
                    toolCallId,
                    result: stocks
                  }
                ]
              }
            ]
          })

          return (
            <BotCard>
              <Stocks props={stocks} />
            </BotCard>
          )
        }
      },
      showStockPrice: {
        description:
          'Get the current stock price of a given stock or currency. Use this to show the price to the user.',
        parameters: z.object({
          symbol: z
            .string()
            .describe(
              'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
            ),
          price: z.number().describe('The price of the stock.'),
          delta: z.number().describe('The change in price of the stock')
        }),
        generate: async function* ({ symbol, price, delta }) {
          yield (
            <BotCard>
              <StockSkeleton />
            </BotCard>
          )

          await sleep(1000)

          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'showStockPrice',
                    toolCallId,
                    args: { symbol, price, delta }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'showStockPrice',
                    toolCallId,
                    result: { symbol, price, delta }
                  }
                ]
              }
            ]
          })

          return (
            <BotCard>
              <Stock props={{ symbol, price, delta }} />
            </BotCard>
          )
        }
      },
      showStockPurchase: {
        description:
          'Show price and the UI to purchase a stock or currency. Use this if the user wants to purchase a stock or currency.',
        parameters: z.object({
          symbol: z
            .string()
            .describe(
              'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
            ),
          price: z.number().describe('The price of the stock.'),
          numberOfShares: z
            .number()
            .optional()
            .describe(
              'The **number of shares** for a stock or currency to purchase. Can be optional if the user did not specify it.'
            )
        }),
        generate: async function* ({ symbol, price, numberOfShares = 100 }) {
          const toolCallId = nanoid()

          if (numberOfShares <= 0 || numberOfShares > 1000) {
            aiState.done({
              ...aiState.get(),
              messages: [
                ...aiState.get().messages,
                {
                  id: nanoid(),
                  role: 'assistant',
                  content: [
                    {
                      type: 'tool-call',
                      toolName: 'showStockPurchase',
                      toolCallId,
                      args: { symbol, price, numberOfShares }
                    }
                  ]
                },
                {
                  id: nanoid(),
                  role: 'tool',
                  content: [
                    {
                      type: 'tool-result',
                      toolName: 'showStockPurchase',
                      toolCallId,
                      result: {
                        symbol,
                        price,
                        numberOfShares,
                        status: 'expired'
                      }
                    }
                  ]
                },
                {
                  id: nanoid(),
                  role: 'system',
                  content: `[User has selected an invalid amount]`
                }
              ]
            })

            return <BotMessage content={'Invalid amount'} />
          } else {
            aiState.done({
              ...aiState.get(),
              messages: [
                ...aiState.get().messages,
                {
                  id: nanoid(),
                  role: 'assistant',
                  content: [
                    {
                      type: 'tool-call',
                      toolName: 'showStockPurchase',
                      toolCallId,
                      args: { symbol, price, numberOfShares }
                    }
                  ]
                },
                {
                  id: nanoid(),
                  role: 'tool',
                  content: [
                    {
                      type: 'tool-result',
                      toolName: 'showStockPurchase',
                      toolCallId,
                      result: {
                        symbol,
                        price,
                        numberOfShares
                      }
                    }
                  ]
                }
              ]
            })

            return (
              <BotCard>
                <Purchase
                  props={{
                    numberOfShares,
                    symbol,
                    price: +price,
                    status: 'requires_action'
                  }}
                />
              </BotCard>
            )
          }
        }
      },
      getEvents: {
        description:
          'List funny imaginary events between user highlighted dates that describe stock activity.',
        parameters: z.object({
          events: z.array(
            z.object({
              date: z
                .string()
                .describe('The date of the event, in ISO-8601 format'),
              headline: z.string().describe('The headline of the event'),
              description: z.string().describe('The description of the event')
            })
          )
        }),
        generate: async function* ({ events }) {
          yield (
            <BotCard>
              <EventsSkeleton />
            </BotCard>
          )

          await sleep(1000)

          const toolCallId = nanoid()

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'getEvents',
                    toolCallId,
                    args: { events }
                  }
                ]
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'getEvents',
                    toolCallId,
                    result: events
                  }
                ]
              }
            ]
          })

          return (
            <BotCard>
              <Events props={events} />
            </BotCard>
          )
        }
      }
    }
  })

  return {
    id: nanoid(),
    display: result.value
  }
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
    confirmPurchase
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onGetUIState: async () => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const aiState = getAIState() as Chat

      if (aiState) {
        const uiState = getUIStateFromAIState(aiState)
        return uiState
      }
    } else {
      return
    }
  },
  onSetAIState: async ({ state }) => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const { chatId, messages } = state

      const createdAt = new Date()
      const userId = session.user.id as string
      const path = `/chat/${chatId}`

      const firstMessageContent = messages[0].content as string
      const title = firstMessageContent.substring(0, 100)

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path
      }

      await saveChat(chat)
    } else {
      return
    }
  }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display:
        message.role === 'tool' ? (
          message.content.map(tool => {
            return tool.toolName === 'listStocks' ? (
              <BotCard>
                {/* TODO: Infer types based on the tool result*/}
                {/* @ts-expect-error */}
                <Stocks props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPrice' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Stock props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPurchase' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Purchase props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'getEvents' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Events props={tool.result} />
              </BotCard>
            ) : null
          })
        ) : message.role === 'user' ? (
          <UserMessage>{message.content as string}</UserMessage>
        ) : message.role === 'assistant' &&
          typeof message.content === 'string' ? (
          <BotMessage content={message.content} />
        ) : null
    }))
}
