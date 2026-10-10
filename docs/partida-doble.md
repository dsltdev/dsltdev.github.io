# Partida Doble

*Una filosofía algorítmica para la landing de David López*

## El movimiento

**Partida Doble** es un movimiento generativo sobre un principio de seiscientos años: en un libro contable sano,
nada nace solo. Cada débito trae su crédito, y la suma de todo lo que se mueve es cero. La belleza de este
sistema no está en ningún fotograma sino en el proceso que lo sostiene: miles de movimientos que se buscan, se
trenzan y se cancelan sin que nadie los dirija.

## Cómo respira el algoritmo

Cada transacción nace como un par de hilos en dos cuentas distintas, dos carriles de un libro invisible. Los hilos
viajan a la misma velocidad hacia una línea de cierre, y lo hacen como imágenes especulares: lo que uno se
desplaza hacia arriba, el otro lo hace hacia abajo, exactamente. Un campo de ruido de Perlin, lento y
estratificado, curva sus trayectorias y los obliga a trenzarse, a cruzarse y a separarse, pero la simetría nunca
se rompe: la amplitud del trenzado nace en cero, florece a mitad del camino y vuelve a cero justo en el cierre,
de modo que ambos hilos llegan al mismo punto al mismo tiempo. Allí se anulan. Queda una marca tenue sobre la
línea de cierre, un tic de contabilidad, y el par desaparece. La obra es la acumulación de esos cierres: un
tejido de simetrías que se resuelven.

## La anomalía

Casi todo se cancela. Pero de vez en cuando, con una probabilidad pequeña y calibrada, nace un hilo **sin
pareja**: el reintento de red que duplicó un cobro, el evento que se perdió, el webhook que nunca llegó. Viaja
como cualquier otro, converge hacia un punto de cierre donde no hay nadie esperándolo, lo cruza sin ser
cancelado, y se convierte en una brasa. Una onda de alarma se abre una sola vez al cruzar la línea; después la
brasa sube despacio, pierde velocidad y se queda a la deriva, dejando una cicatriz que tarda segundos en
borrarse. La composición completa se reconoce por esa tensión: un campo entero en equilibrio y, en medio de la
calma, unos pocos puntos cálidos que no cierran. El observador no necesita saber contabilidad para sentirlo.

## El tiempo y la semilla

El sistema avanza con un paso fijo de sesenta cuadros por segundo, independiente de la pantalla que lo muestre,
y toda su aleatoriedad nace de una única semilla: la misma semilla produce siempre exactamente el mismo libro,
trazo por trazo, y cada semilla nueva revela otra faceta del mismo mecanismo. Nada depende del dibujo; el dibujo
solo lee el estado. Por eso la obra puede detenerse, reanudarse, redimensionarse o congelarse en un fotograma
sin traicionar su lógica.

## El oficio

Este algoritmo debe sentirse como el producto de incontables horas de refinamiento, obra de alguien en la cima
de su disciplina: una implementación de nivel maestro, calibrada con paciencia, donde cada constante fue
elegida después de muchas iteraciones y ninguna es arbitraria. La densidad de los hilos, la longitud de las
estelas, la relación entre el trenzado y la separación de los carriles, el peso de la línea y el brillo de la
brasa son el resultado de un ajuste meticuloso, de esa clase de afinación que solo se logra mirando la misma
composición cientos de veces. Complejidad sin ruido, orden sin rigidez: el equilibrio de un libro bien llevado.
La paleta es la de la casa: ámbar para el débito, azul frío para el crédito y un único rojo cálido, reservado
para lo que no cierra.
