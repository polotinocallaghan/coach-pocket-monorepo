# Skill: Equipo Coach's Pocket (Multi-Agente)

[cite_start]Esta habilidad permite a Antigravity coordinar un equipo de agentes especializados para desarrollar la plataforma "Coach's Pocket", trabajando en paralelo sobre el mismo repositorio[cite: 1, 2].

## 1. Configuración del Entorno de Comunicación
[cite_start]El equipo utiliza una infraestructura técnica para sincronizarse sin errores[cite: 3, 4]:
- [cite_start]`.antigravity/team/tasks.json` -> Lista maestra de tareas de entrenamiento y desarrollo[cite: 5].
- [cite_start]`.antigravity/team/mailbox/` -> Buzón para coordinación entre agentes[cite: 6].
- [cite_start]`.antigravity/team/broadcast.msg` -> Directrices globales del Director[cite: 7].
- [cite_start]`.antigravity/team/locks/` -> Evita que dos agentes editen el mismo archivo de la app a la vez[cite: 8].

## 2. Roles Especializados en Tenis y Tech
1. **Director (Coach Master)**: Líder del proyecto. [cite_start]Divide los módulos (Entrenamiento, Equipo, Network), asigna tareas y aprueba los planes de acción[cite: 9, 10].
2. [cite_start]**Arquitecto de Datos**: Define la estructura en Firebase para ejercicios, jugadores y analíticas de rendimiento antes de programar[cite: 9, 11].
3. [cite_start]**Especialista Frontend (Next.js/Tailwind)**: Crea interfaces táctiles e intuitivas para que el coach las use en pista[cite: 9, 12].
4. [cite_start]**Especialista Backend (Firebase)**: Implementa la lógica de autenticación, sincronización en tiempo real y seguridad de datos[cite: 9, 12].
5. [cite_start]**Investigador de Metodología**: Busca y documenta las mejores prácticas de coaching de tenis para integrarlas en la app[cite: 9, 14].
6. **Revisor de Calidad (QA)**: Actúa como "Devil's Advocate". [cite_start]Busca bugs en el código y asegura que la app sea robusta para el uso profesional[cite: 9, 15].

## 3. Protocolo de Trabajo (Reglas Críticas)
- **Modo Planificación**: Cada agente debe enviar un **Plan de Acción** al Director antes de tocar el código. [cite_start]Solo operan tras recibir un `APPROVED`[cite: 17, 18, 19].
- [cite_start]**Sincronización**: No se puede iniciar una tarea si sus dependencias (ej. el esquema de base de datos) no están en estado `COMPLETED`[cite: 23, 24, 25].
- [cite_start]**Seguridad**: NUNCA editar archivos con un `.lock` activo para evitar conflictos de versiones[cite: 26, 27].

## 4. Inicialización
Para activar al equipo, solicita: *"Usa la habilidad de equipo Coach's Pocket para inicializar este módulo"*.