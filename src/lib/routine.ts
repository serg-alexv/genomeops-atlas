export type RoutineLocale = 'en' | 'ru'
export type RoutineIntent = 'doubt' | 'compare' | 'plan' | 'better_ai'
export type RoutineChoice = 'a' | 'b'

export interface RoutineOption {
  title: string
  detail: string
}

export interface RoutineResult {
  startHere: string
  aiTakeover: string
  keepHuman: string
  testIntro: string
  optionA: RoutineOption
  optionB: RoutineOption
  recommended: RoutineChoice
  steps: string[]
}

export interface StoredAim {
  id: string
  input: string
  intent: RoutineIntent
  createdAt: string
  completed: boolean
  choice?: RoutineChoice
}

export const ROUTINE_AIMS_KEY = 'genomeops-atlas:routine-aims:v1'
export const ROUTINE_LOCALE_KEY = 'genomeops-atlas:locale:v1'

const literaturePattern = /paper|literature|article|research|review|study|стат|литератур|исслед|обзор|публикац/i
const comparisonPattern = /compare|versus|\bvs\b|option|choos|choice|between|сравн|выб|вариант/i
const planningPattern = /plan|postpon|procrast|stuck|start|routine|план|отклады|застр|начать|рутин/i

export const inferRoutineIntent = (input: string, preferred?: RoutineIntent): RoutineIntent => {
  if (preferred) return preferred
  if (comparisonPattern.test(input)) return 'compare'
  if (planningPattern.test(input)) return 'plan'
  return 'doubt'
}

const resultTemplates: Record<RoutineLocale, Record<'literature' | RoutineIntent, RoutineResult>> = {
  en: {
    literature: {
      startHere: 'Close the random tabs. Define the output: a one-page evidence table, not “understand everything”.',
      aiTakeover: 'Let AI extract the claim, evidence, method, caveat, and source location from the first two papers.',
      keepHuman: 'You decide whether the evidence is relevant and whether each claim survives a source check.',
      testIntro: 'Run both approaches on the same two papers. Keep the one that leaves you with something reusable.',
      optionA: { title: 'Ask for summaries', detail: 'Get concise summaries of the two papers.' },
      optionB: { title: 'Build an evidence table', detail: 'Put claims, evidence, caveats, and source locations side by side.' },
      recommended: 'b',
      steps: ['Choose two papers, not ten', 'Run the selected method on both', 'Check one claim against the source'],
    },
    doubt: {
      startHere: 'Turn the doubt into one question that could change what you do next.',
      aiTakeover: 'Let AI list the assumptions, missing information, and the cheapest way to check each one.',
      keepHuman: 'You own the stakes, the evidence threshold, and the final decision.',
      testIntro: 'Use the same doubt twice. Compare generic advice with a small falsifiable check.',
      optionA: { title: 'Ask for advice', detail: 'Get an immediate opinion and possible next steps.' },
      optionB: { title: 'Design a quick check', detail: 'Name one assumption and test it with real evidence.' },
      recommended: 'b',
      steps: ['Write the decision behind the doubt', 'Name the riskiest assumption', 'Find one piece of disconfirming evidence'],
    },
    compare: {
      startHere: 'Name the decision and the one outcome that matters most. Ignore secondary features for ten minutes.',
      aiTakeover: 'Let AI create the same realistic scenario for both options and expose hidden trade-offs.',
      keepHuman: 'You set the weights, red lines, and consequences that no model can know for you.',
      testIntro: 'Compare recommendation mode with scenario mode. See which one makes the trade-off clearer.',
      optionA: { title: 'Ask which option is better', detail: 'Receive a direct recommendation from the available context.' },
      optionB: { title: 'Run one scenario through both', detail: 'Compare both options under the same constraint and success test.' },
      recommended: 'b',
      steps: ['Write one success condition', 'Run the same scenario for A and B', 'Record the trade-off you can accept'],
    },
    plan: {
      startHere: 'Choose the smallest useful result you can finish today. Do not plan the whole project yet.',
      aiTakeover: 'Let AI turn that result into a ten-minute start with inputs, actions, and a visible finish line.',
      keepHuman: 'You define what “useful” and “done” mean; AI keeps the path small and concrete.',
      testIntro: 'Compare a complete plan with an immediate start. Keep the version that creates movement.',
      optionA: { title: 'Make the full plan', detail: 'Map every phase, dependency, and later task.' },
      optionB: { title: 'Design the first 10 minutes', detail: 'Create one bounded action you can begin now.' },
      recommended: 'b',
      steps: ['Name today’s smallest useful output', 'Prepare only the first input', 'Finish one visible ten-minute slice'],
    },
    better_ai: {
      startHere: 'Show Atlas the task, the material you already have, and the output you actually need.',
      aiTakeover: 'Let AI separate the repetitive work from the judgment and turn the repeatable part into a reusable routine.',
      keepHuman: 'You keep taste, responsibility, source checking, and the decision to publish or act.',
      testIntro: 'Run the task once as a loose chat and once as a named routine. Compare the outputs.',
      optionA: { title: 'Use one long chat', detail: 'Explain everything again and hope the answer is useful.' },
      optionB: { title: 'Build a reusable routine', detail: 'Save the inputs, checks, and output shape for next time.' },
      recommended: 'b',
      steps: ['Name the repeated task', 'Separate judgment from repetition', 'Save the winning input and output pattern'],
    },
  },
  ru: {
    literature: {
      startHere: 'Закройте случайные вкладки. Сначала определите результат: таблица доказательств на одной странице, а не «понять всё».',
      aiTakeover: 'Пусть AI извлечёт из первых двух статей тезис, доказательство, метод, ограничение и место в источнике.',
      keepHuman: 'Вы решаете, относится ли доказательство к задаче и выдерживает ли тезис проверку по первоисточнику.',
      testIntro: 'Прогоните одни и те же две статьи через оба подхода. Оставьте тот, после которого остаётся полезный артефакт.',
      optionA: { title: 'Попросить пересказ', detail: 'Получить краткий пересказ двух статей.' },
      optionB: { title: 'Собрать таблицу доказательств', detail: 'Свести рядом тезисы, доказательства, ограничения и места в источнике.' },
      recommended: 'b',
      steps: ['Выбрать две статьи, а не десять', 'Прогнать обе через выбранный подход', 'Проверить один тезис по первоисточнику'],
    },
    doubt: {
      startHere: 'Превратите сомнение в один вопрос, ответ на который действительно изменит следующий шаг.',
      aiTakeover: 'Пусть AI перечислит допущения, пробелы и самый дешёвый способ проверить каждое из них.',
      keepHuman: 'Вы определяете ставки, достаточность доказательств и принимаете окончательное решение.',
      testIntro: 'Задайте одно сомнение двумя способами: как просьбу о совете и как маленькую проверяемую гипотезу.',
      optionA: { title: 'Попросить совета', detail: 'Получить мнение и возможные следующие шаги.' },
      optionB: { title: 'Придумать быструю проверку', detail: 'Назвать одно допущение и проверить его реальными данными.' },
      recommended: 'b',
      steps: ['Записать решение за сомнением', 'Назвать самое рискованное допущение', 'Найти один опровергающий факт'],
    },
    compare: {
      startHere: 'Назовите решение и один результат, который важнее всего. На десять минут забудьте про второстепенные функции.',
      aiTakeover: 'Пусть AI прогонит оба варианта через один реалистичный сценарий и покажет скрытые компромиссы.',
      keepHuman: 'Вы задаёте веса, красные линии и последствия, которых модель за вас не знает.',
      testIntro: 'Сравните прямую рекомендацию со сценарной проверкой. Оставьте подход, который яснее показывает компромисс.',
      optionA: { title: 'Спросить, что лучше', detail: 'Получить прямую рекомендацию из доступного контекста.' },
      optionB: { title: 'Прогнать один сценарий', detail: 'Сравнить оба варианта при одинаковом ограничении и критерии успеха.' },
      recommended: 'b',
      steps: ['Записать один критерий успеха', 'Прогнать одинаковый сценарий для A и B', 'Зафиксировать приемлемый компромисс'],
    },
    plan: {
      startHere: 'Выберите самый маленький полезный результат, который можно закончить сегодня. Пока не планируйте весь проект.',
      aiTakeover: 'Пусть AI превратит результат в десятиминутный старт: входные данные, действия и видимый финиш.',
      keepHuman: 'Вы определяете, что значит «полезно» и «готово»; AI удерживает путь маленьким и конкретным.',
      testIntro: 'Сравните полный план с немедленным стартом. Оставьте версию, которая создаёт движение.',
      optionA: { title: 'Составить полный план', detail: 'Разложить все этапы, зависимости и будущие задачи.' },
      optionB: { title: 'Спроектировать первые 10 минут', detail: 'Создать одно ограниченное действие, которое можно начать сейчас.' },
      recommended: 'b',
      steps: ['Назвать минимальный полезный результат на сегодня', 'Подготовить только первый вход', 'Закончить один видимый десятиминутный фрагмент'],
    },
    better_ai: {
      startHere: 'Покажите Atlas задачу, уже имеющийся материал и результат, который вам действительно нужен.',
      aiTakeover: 'Пусть AI отделит повторяемую работу от суждения и превратит повторяемую часть в готовый маршрут.',
      keepHuman: 'За вами остаются вкус, ответственность, проверка источников и решение публиковать или действовать.',
      testIntro: 'Один раз решите задачу в свободном чате, второй — как именованный маршрут. Сравните результаты.',
      optionA: { title: 'Использовать один длинный чат', detail: 'Снова объяснить всё и надеяться на полезный ответ.' },
      optionB: { title: 'Собрать повторяемый маршрут', detail: 'Сохранить входы, проверки и форму результата на следующий раз.' },
      recommended: 'b',
      steps: ['Назвать повторяемую задачу', 'Отделить суждение от рутины', 'Сохранить лучший шаблон входа и результата'],
    },
  },
}

export const buildRoutineResult = (
  input: string,
  locale: RoutineLocale,
  preferredIntent?: RoutineIntent,
): { intent: RoutineIntent; result: RoutineResult } => {
  const intent = inferRoutineIntent(input, preferredIntent)
  const templateKey = literaturePattern.test(input) ? 'literature' : intent
  return { intent, result: resultTemplates[locale][templateKey] }
}

export const loadRoutineAims = (): StoredAim[] => {
  if (typeof window === 'undefined') return []
  try {
    const value = window.localStorage.getItem(ROUTINE_AIMS_KEY)
    if (!value) return []
    const parsed = JSON.parse(value) as StoredAim[]
    return Array.isArray(parsed) ? parsed.slice(0, 8) : []
  } catch {
    return []
  }
}

export const saveRoutineAims = (aims: StoredAim[]) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ROUTINE_AIMS_KEY, JSON.stringify(aims.slice(0, 8)))
  }
}
