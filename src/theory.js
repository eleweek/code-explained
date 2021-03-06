import * as React from 'react';
import {ProbingVisualization, GenerateProbingLinks} from './probing_visualization';
import {HashExamples} from './chapter2_hash_table_functions';

export function CollisionsTheory() {
    return (
        <>
            <h1>Коллизии в хеш-таблицах</h1>
            <p>
                Хеш-таблица — структура данных, хранящая пары «ключ-значение» или только ключ. Позволяет быстро найти
                ключ и, если есть, связанное с ним значение.
            </p>
            <h2>Как найти нужный элемент с помощью линейного поиска</h2>
            <p>
                Последовательно перебирать все элементы списка, пока не найдется требуемый. В худшем случае — придется
                проверить все элементы. А в среднем — половину.
            </p>
            <h2>Как найти нужный элемент хеш-таблицы</h2>
            <p>
                По ключу понять, с какого места таблицы искать. И начать поиск рядом с нужным элементом. В среднем такой
                поиск займет пару итераций.{' '}
            </p>
            <h2>Пример из реальной жизни</h2>
            <p>
                Представьте, что вы ищете книгу в библиотеке. Если книги стоят в случайном порядке, то придется
                перебирать все по одной, пока не найдете нужную. А если книги стоят в алфавитном порядке, то
                библиотекарь может пойти сразу к нужной полке и перебрать несколько книг, а не всю библиотеку.{' '}
            </p>
            <h2>Устройство простейшей хеш-таблицы</h2>
            <p>
                Простейшая хеш-таблица — это массив из ключей. Индекс ключа вычисляется по самому ключу. Однако у разных
                ключей индекс может совпасть. Такие ситуации называются коллизиями.{' '}
            </p>
            <p>
                В следующей визуализации мы разберемся, как решать коллизии и создадим простейшую хеш-таблицу без потери
                данных.
            </p>
        </>
    );
}

const {links: probingLinks} = new GenerateProbingLinks().run(8, '', 'i+1');

function ProbingVisualizationAndDescription() {
    return (
        <>
            {' '}
            <ProbingVisualization slotsCount={8} links={probingLinks} adjustTop={-65} fixedHeight={85} />
            <h2>Алгоритм разрешения коллизий</h2>
            <p>
                Если текущая ячейка занята, то мы проверим следующую. Если занята и она, то проверим следующую за ней. И
                так до тех пор, пока не найдем свободную ячейку.
            </p>
            <p>
                Таблицы с таким способом разрешения коллизий называются хеш-таблицами{' '}
                <a
                    className="link"
                    target="_blank"
                    href="https://ru.wikipedia.org/wiki/%D0%A5%D0%B5%D1%88-%D1%82%D0%B0%D0%B1%D0%BB%D0%B8%D1%86%D0%B0#%D0%9E%D1%82%D0%BA%D1%80%D1%8B%D1%82%D0%B0%D1%8F_%D0%B0%D0%B4%D1%80%D0%B5%D1%81%D0%B0%D1%86%D0%B8%D1%8F"
                >
                    с открытой адресацией
                </a>
                .{' '}
            </p>
            <p>
                Есть и другой способ разрешения коллизий —{' '}
                <a
                    className="link"
                    target="_blank"
                    href="https://ru.wikipedia.org/wiki/%D0%A5%D0%B5%D1%88-%D1%82%D0%B0%D0%B1%D0%BB%D0%B8%D1%86%D0%B0#%D0%9C%D0%B5%D1%82%D0%BE%D0%B4_%D1%86%D0%B5%D0%BF%D0%BE%D1%87%D0%B5%D0%BA"
                >
                    метод цепочек
                </a>
                . В хеш-таблицах с цепочками каждая ячейка является односвязным списком. Такие ячейки позволяют хранить
                сразу несколько элементов.
            </p>
        </>
    );
}

export function SimplifiedHashTheory(props) {
    return (
        <>
            <h1>Простейшие хеш-таблицы</h1>
            <p>
                Хеш-таблица — структура данных, хранящая пары «ключ-значение» или только ключ. Позволяет быстро найти
                ключ и, если есть, связанное с ним значение.
            </p>
            <p>
                Простейшая хеш-таблица — это массив из ключей. Индекс ключа вычисляется по самому ключу. Однако у разных
                ключей индекс может совпасть. Такие ситуации называются коллизиями.{' '}
            </p>
            <ProbingVisualizationAndDescription />
            <h2>Производительность и расход памяти</h2>
            <p>
                Чем больше свободного места в хеш-таблице, тем меньше коллизий. В пустой таблице не будет ни одной
                коллизии, а в почти полной — они будут почти наверняка.{' '}
            </p>
            <p>
                Однако чем больше свободного места, тем больше расходуется памяти. Поэтому при использовании хеш-таблиц
                стараются достичь баланса. Таблица должна быть не слишком пустой, но и не слишком заполненной. Проблемы
                с производительностью начиют быть заметны при заполненности на две трети.
            </p>
            <p>На нашей визуализации размер таблицы выбран так, чтобы таблица была заполнена наполовину.</p>
            <h2>Создание хеш-таблицы</h2>
            <p>
                Для создания хеш-таблицы мы последовательно вставляем ключи один за другим. При возникновении коллизии
                переходим к соседней ячейке. Вставляем ключ в первую свободную ячейку.
            </p>
            <h2>Поиск в хеш-таблице</h2>
            <p>
                Поиск ключа аналогичен вставке. Вычисляем индекс и ищем пустой слот, как при разрешении коллизий. Если
                по пути мы не нашли ключа, то его нет в таблице.
            </p>
        </>
    );
}

export function HashTheory(props) {
    return (
        <>
            <h1>Хеш-таблицы с открытой адресацией</h1>
            <p>
                Хеш-таблица — структура данных, хранящая пары «ключ-значение» или только ключ. Позволяет быстро найти
                ключ и, если есть, связанное с ним значение.{' '}
            </p>
            <p>
                Хеш-таблица с открытой адресацией представляет себе массив из ячеек, в каждой из которых может быть
                записан ключ. Индекс ключа вычисляется по самому ключу с помощью хеш-функции. У разных ключей индекс
                может совпасть. Такие ситуации называются коллизиями.
            </p>
            <p>
                Задача хеш-функции — по объекту вычислить число по заранее заданному алгоритму. Вычисленное число
                называется хеш-кодом. Алгоритм хеш-фукнции должен помогать равномерно «раскидать» значения по
                хеш-таблице. Поэтому у двух похожих значений (например <code>"hello"</code> и <code>"hello!"</code>)
                может оказаться совсем разный хеш-код.
            </p>
            <h2>Примеры значений хеш-функций</h2>
            <p>
                В Python есть встроенная хеш-функция <code>hash()</code>. В нашем коде мы используем именно ее.
            </p>
            <HashExamples />
            <h2>Создание хеш-таблицы</h2>
            <p>
                Для создания хеш-таблицы мы последовательно вставляем ключи один за другим. При возникновении коллизии
                переходим к соседней ячейке. Вставляем ключ в первую свободную ячейку.
            </p>
            <h2>Поиск</h2>
            <p>
                Поиск ключа аналогичен вставке. Вычисляем индекс и ищем пустой слот, как при разрешении коллизий. Если
                по пути мы не нашли ключа, то его нет в таблице.
            </p>
            <h2>Удаление</h2>
            <p>
                При удалении ключа мы перезаписываем его специальным значением-плейсхолдером <code>DUMMY</code>. Если мы
                оставим слот пустым, то при поиске другого ключа алгоритм разрешения коллизий может остановиться раньше
                времени.
            </p>
            <h2>Расширение</h2>
            <p>
                Если при работе хеш-таблицы она заполняется, то ее нужно расширить. Однако вычисленные индексы элементов
                зависят от размера таблицы. Это значит, что если изменится размер — изменятся и индексы. Для того, чтобы
                вставленные ключи можно было снова найти, мы создаем новую таблицу и вставляем в нее ключи из старой.
            </p>
        </>
    );
}

export function BubbleSortTheory() {
    return (
        <>
            <h1> Сортировка пузырьком</h1>
            <p>
                Сортировка пузырьком — самая простая для понимания и реализации сортировка. Алгоритм по очереди
                просматривает все элементы списка{`\u00a0`}— сравнивает текущий элемент со следующим и при необходимости
                меняет их местами. Таким образом, алгоритм проходит по списку, пока все элементы не будут упорядочены.
            </p>
            <p>Пузырьковая сортировка является простейшей и эффективна лишь для небольших списков.</p>
        </>
    );
}

export function QuickSortTheory() {
    return (
        <>
            <h1> Быстрая сортировка</h1>
            <p>Быстрая сортировка — одна из самых быстрых сортировок. Основана на принципе «Разделяй и властвуй».</p>
            <p>
                На каждой итерации алгоритма выбирается элемент-делитель. Делитель может быть любым элементом массива. В
                нашей реализации выбирается элемент посередине.{' '}
            </p>
            <p>
                Затем элементы распределяются относительно делителя так, чтобы слева были все меньшие элементы, а справа
                {`\u00a0`}— все большие. Таким образом массив становится несколько более упорядоченным и делитель
                оказывается на нужном месте.
            </p>
            <p>После этого алгоритм повторяется рекурсивно для левой и правой половин.</p>
        </>
    );
}
