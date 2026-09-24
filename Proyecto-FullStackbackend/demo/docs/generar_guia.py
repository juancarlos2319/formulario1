"""Documentación revisada manualmente; referencias calculadas sobre las fuentes actuales."""
from pathlib import Path
from datetime import datetime
from html import escape
import hashlib
import json
import re
import textwrap
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Preformatted
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs'
FILES = sorted(p.relative_to(ROOT).as_posix() for base in ('src', 'scripts', '.mvn') for p in (ROOT/base).rglob('*') if p.is_file())
FILES += ['pom.xml', 'mvnw', 'mvnw.cmd', '.gitignore', '.gitattributes', 'README.md']
ENTRIES = []
UPDATES = {'PersonaService.java': ('Registra titulares y relaciona personas de contacto con parentescos. Las '
                         'operaciones se ejecutan dentro de transacciones.',
                         '\n'
                         'public List<com.example.demo.dto.ContactoDTO> obtenerContactos | Devuelve todas '
                         'las relaciones del titular activo.\n'
                         'public List<com.example.demo.dto.ContactoDTO> guardarContactos | Sustituye la '
                         'lista completa; exige al menos uno y no impone máximo.\n'
                         'findByTitularTrueAndFechaBajaIsNull | Lista exclusivamente titulares activos, no '
                         'personas creadas solo como contacto.\n'
                         'public FormularioDTO guardar | Valida titular, contactos y comunicaciones antes '
                         'del alta transaccional.\n'
                         'countByTitularTrueAndFechaBajaIsNull | El límite de 20 cuenta solo titulares; no '
                         'hay bloqueo concurrente.\n'
                         'persona.setTitular(true) | Identifica el registro principal como titular.\n'
                         'saveAndFlush(persona) | Persiste persona y relaciones dentro de la misma '
                         'transacción.\n'
                         'public FormularioDTO actualizar | Actualiza datos/comunicaciones de titular '
                         'activo; los contactos se gestionan en su propia ruta.\n'
                         'setFechaBaja(LocalDate.now()) | Baja lógica del titular, sin borrar personas ni '
                         'relaciones compartidas.\n'
                         'dto.setContactosEmergencia(contactos) | Incluye la lista completa en la respuesta, '
                         'además de los campos singulares del primero.\n'
                         'dto.setCorreosAdicionales | Devuelve comunicaciones secundarias; la siguiente '
                         'línea hace lo mismo con teléfonos.\n'
                         'private void validarTitular | Exige nombre y apellido de hasta 100 caracteres y '
                         'fecha de nacimiento a los titulares.\n'
                         'private Persona titularActivo | Rechaza personas dadas de baja o que solo sean '
                         'contactos con 404.\n'
                         'private void validarContactos | Mínimo uno; rechaza IDs repetidos e inválidos. Las '
                         'personas nuevas necesitan nombre, apellido y teléfono.\n'
                         'private CatalogoParentesco resolverParentesco | Busca parentesco existente por ID '
                         'o nombre exacto; no crea catálogo desde el formulario.\n'
                         'private void reemplazarContactos | Reutiliza personas activas por ID o crea '
                         'personas de contacto. Rechaza autorreferencias.\n'
                         'contacto.setTitular(false) | La persona nueva creada como contacto no cuenta como '
                         'titular.\n'
                         'titular.getContactosEmergencia().removeIf | Quita relaciones omitidas; '
                         'orphanRemoval elimina solo los vínculos, nunca personas compartidas.\n'
                         'private com.example.demo.dto.ContactoDTO contactoADTO | Devuelve ID de persona, '
                         'nombre, apellido, teléfono y parentesco de la relación.\n'
                         'private void validarComunicacion | Mantiene dos correos y dos teléfonos completos '
                         'para titulares.\n'
                         'private void actualizarComunicacion | Crea posiciones faltantes y actualiza '
                         'comunicaciones principales/secundarias.\n'),
 'ContactoEmergencia.java': ('Entidad de unión entre dos personas, con parentesco propio de cada vínculo. No '
                             'contiene nombre o teléfono duplicados.',
                             '\n'
                             '@Table | Mapea persona_contacto_emergencia; UNIQUE evita repetir el par '
                             'titular/contacto.\n'
                             '@org.hibernate.annotations.Check | Impide autorreferencia también al generar '
                             'el esquema JPA.\n'
                             '@JoinColumn(name = "id_persona" | Referencia al titular.\n'
                             '@JoinColumn(name = "id_contacto" | Referencia a la persona compartida, sin '
                             'cascada de borrado.\n'
                             '@JoinColumn(name = "id_parentesco" | Referencia al catálogo de parentescos.\n'
                             'public Persona getContacto | Acceso a los datos de la persona de contacto.\n'),
 'ContactoDTO.java': ('Contrato de una relación de contacto. Los IDs distinguen una persona existente de una '
                      'nueva.',
                      '\n'
                      'public record | idContacto es el ID de persona, no el ID del vínculo. Sin ID se '
                      'exigen nombre, apellido y teléfono; idParentesco o parentesco identifican el '
                      'catálogo.\n'),
 'FormularioDTO.java': ('Contrato del titular con comunicaciones y lista variable de contactos.',
                        '\n'
                        'private java.util.List<String> correosAdicionales | Exactamente un correo '
                        'secundario exigido por el servicio.\n'
                        'private java.util.List<String> telefonosAdicionales | Exactamente un teléfono '
                        'secundario.\n'
                        'private java.util.List<ContactoDTO> contactosEmergencia | Lista de mínimo un '
                        'contacto, sin máximo; se recibe al crear y se rellena en respuestas.\n'
                        'private Long id | ID del titular.\n'
                        'aceptaTerminos = true | Valor no validado ni persistido actualmente.\n'
                        'private String contactoEmergenciaNombre | Campos singulares del primer contacto '
                        'conservados por compatibilidad.\n'
                        'public Long getId() | Accesores para serialización y uso del servicio.\n'),
 'Persona.java': ('Datos compartidos por titulares y contactos. Las colecciones se ordenan por ID '
                  'ascendente.',
                  '\n'
                  '@Table | Mapea la tabla persona.\n'
                  '@Column(name = "fecha_nacimiento") | Permite fecha nula para personas creadas como '
                  'contacto.\n'
                  '@Column(name = "es_titular" | Marca explícita para distinguir titular de contacto.\n'
                  '@JoinColumn(name = "id_ocupacion") | Ocupación opcional en persistencia; el alta del '
                  'titular la exige en servicio.\n'
                  'private List<ContactoEmergencia> | Colección de vínculos salientes; cascada y eliminación '
                  'de huérfanos solo sobre relaciones.\n'
                  'private List<PersonaCorreo> | Correos ordenados por ID: primero principal y restantes '
                  'adicionales.\n'
                  'private List<PersonaTelefono> | Teléfonos ordenados del mismo modo.\n'
                  'public boolean isTitular | Consulta la distinción de rol de registro, independiente del '
                  'rol del usuario de login.\n'
                  'public ContactoEmergencia getContactoEmergencia | Accesor singular conservado: devuelve '
                  'la primera relación.\n'),
 'PersonaCorreo.java': ('Correo asociado a una persona; longitud alineada en 150 con SQL y servicio.',
                        '\n'
                        '@Table | Mapea persona_correo.\n'
                        '@GeneratedValue | Identificador generado por base.\n'
                        '@JoinColumn | Vincula al padre por id_persona.\n'
                        '@Column(nullable = false, length = 150) | Longitud y obligatoriedad del correo.\n'
                        'public String getCorreo | Acceso al valor para construir el DTO.\n'),
 'PersonaTelefono.java': ('Teléfono asociado a una persona; SQL/JPA admiten 30 caracteres y el alta HTTP '
                          'exige diez dígitos.',
                          '\n'
                          '@Table | Mapea persona_telefono.\n'
                          '@GeneratedValue | Identificador generado por base.\n'
                          '@JoinColumn | Relación ManyToOne a persona.\n'
                          '@Column(nullable = false, length = 30) | Longitud alineada con schema.sql.\n'
                          'public String getTelefono | Devuelve el número.\n'),
 'PersonaRepository.java': ('Acceso a personas con consultas explícitas para titulares activos.',
                            '\n'
                            'extends JpaRepository | Hereda persistencia y búsqueda por ID para titulares y '
                            'contactos.\n'
                            'findByTitularTrueAndFechaBajaIsNull | Lista solo titulares activos.\n'
                            'countByTitularTrueAndFechaBajaIsNull | Cuenta solo titulares activos, '
                            'excluyendo contactos del límite de 20.\n'),
 'schema.sql': ('Esquema con contactos como personas y unión N a N con parentesco.',
                '\n'
                'CREATE TABLE IF NOT EXISTS catalogo_parentesco | Catálogo de parentescos.\n'
                'CREATE TABLE IF NOT EXISTS persona ( | Datos de titulares y contactos; fecha/ocupación '
                'pueden ser nulas.\n'
                'es_titular BOOLEAN | Marca explícita; contactos por defecto.\n'
                'CREATE TABLE IF NOT EXISTS persona_contacto_emergencia | Unión entre titular y contacto con '
                'parentesco.\n'
                'uq_pce_par | Restricción que evita repetir el par.\n'
                'ck_pce_distintos | Prohíbe una persona como contacto de sí misma.\n'
                'CREATE INDEX IF NOT EXISTS idx_pce_contacto | Facilita búsqueda de relaciones entrantes.\n'
                'CREATE TABLE IF NOT EXISTS persona_correo | Correos de hasta 150 caracteres.\n'
                'CREATE TABLE IF NOT EXISTS persona_telefono | Teléfonos de hasta 30 caracteres.\n'
                'CREATE TABLE IF NOT EXISTS usuario | Cuenta con id_persona obligatorio, todavía no mapeado '
                'en la entidad Usuario.\n'),
 'data.sql': ('Semilla con ocupaciones, parentescos, dos titulares, dos contactos-persona, comunicaciones y '
              'cuentas.',
              '\n'
              'INSERT INTO catalogo_ocupacion | Siete ocupaciones iniciales.\n'
              'INSERT INTO catalogo_parentesco | Once parentescos iniciales.\n'
              'INSERT INTO persona ( | Incluye es_titular: true para administradores y false para '
              'contactos.\n'
              'INSERT INTO persona_correo | Correos iniciales; repetir la semilla puede duplicarlos.\n'
              'INSERT INTO persona_telefono | Teléfonos de titulares y contactos.\n'
              'INSERT INTO persona_contacto_emergencia | Vínculos titular/contacto/parentesco; evita '
              'duplicar el mismo par.\n'
              'INSERT INTO usuario | Cuentas con hashes BCrypt; no se verificaron contraseñas.\n'
              "SELECT setval('usuario_id_seq' | Ajusta la secuencia de usuarios después de IDs "
              'explícitos.\n'),
 'RegistroCompletoTest.java': ('Catorce pruebas unitarias con repositorios simulados.',
                               '\n'
                               '@BeforeEach | Inyecta mocks y configura respuestas de catálogo/guardado.\n'
                               'void permiteUnContactoYDevuelveIdentidadCompleta | Comprueba mínimo uno y '
                               'respuesta con IDs/apellido.\n'
                               'void permiteMasDeDosContactosSinContarlosComoTitulares | Comprueba cuatro '
                               'contactos excluidos de la categoría titular.\n'
                               'void compartePersonaEntreTitularesSinModificarSusDatos | Reutiliza una '
                               'persona y conserva sus datos compartidos.\n'
                               'void reemplazarQuitaSoloRelacionYSostieneLasConservadas | Quita vínculos sin '
                               'borrar personas.\n'
                               'void rechazaAutorreferencia | Rechaza contacto igual al titular.\n'
                               'void rechazaIDsDuplicados | Rechaza repetición de IDs en una lista.\n'
                               'void contactoNoSePuedeEditarComoTitular | Evita operar sobre contactos a '
                               'través de las rutas de titular.\n'
                               'void limiteVeinteTitulares | Comprueba el límite de altas.\n'),
 'DemoApplicationTests.java': ('Siete pruebas de integración con PostgreSQL. Sustituyen la suite anterior '
                               'que dependía de AuthService inexistente.',
                               '\n'
                               '@EnabledIfEnvironmentVariable | Solo habilita una base local desechable '
                               'nomina_backend_test con puerto explícito.\n'
                               'spring.jpa.hibernate.ddl-auto=none | Prueba contra el esquema SQL real, no '
                               'contra uno inventado por Hibernate.\n'
                               '@BeforeEach | Crea tablas si faltan y vacía datos de la base de prueba.\n'
                               'void persisteCuatroContactosComoPersonasYListaSoloTitular | Comprueba la '
                               'persistencia de cuatro personas de contacto y un titular.\n'
                               'void contactoCompartidoSobreviveARetirarUnaRelacion | Verifica que borrar un '
                               'vínculo no borra al contacto compartido.\n'
                               'void repetirPutConIDsNoDuplicaPersonasNiRelaciones | Comprueba repetición '
                               'segura cuando se conservan los IDs.\n'
                               'void falloPosteriorRevierteNuevasPersonasYOcupacion | Comprueba rollback del '
                               'alta completa.\n'
                               'void falloPutRevierteCambioDeRelaciones | Comprueba rollback durante '
                               'sustitución de contactos.\n'
                               'void restriccionesSqlRechazanAutorreferenciaYDuplicado | Verifica CHECK y '
                               'UNIQUE en PostgreSQL.\n'
                               'void bajaTitularNoEliminaContactoCompartido | Baja lógica sin borrado de '
                               'personas.\n'),
 'README.md': ('Contrato actual de API y guía de archivos.',
               '\n'
               '## Funcionamiento | Modelo de titulares, contactos y relaciones.\n'
               '## Configuración | Arranque y conexión.\n'
               '## Autenticación | Token nuevo de una hora y alcance del login.\n'
               '## Rutas | Endpoints incluyendo catálogo de parentescos.\n'
               '## Registro y actualización | JSON nuevo, IDs y sustitución de listas.\n'
               '## SQL inicial | Preparación de una base nueva.\n'
               '## Pruebas existentes | Resultados y ejecución en base desechable.\n'
               '## Documentación PDF | Regeneración y alcance.\n')}

def add(name, purpose, items):
    if name in UPDATES: purpose, items = UPDATES[name]
    paths = [p for p in FILES if Path(p).name == name]
    assert len(paths) == 1, (name, paths)
    points = [tuple(line.split(' | ', 1)) for line in items.strip().splitlines()]
    ENTRIES.append((paths[0], purpose, points))

add('DemoApplication.java', 'Punto de entrada del backend. Arranca Spring y descubre los componentes del paquete de aplicación.', '''
@SpringBootApplication | Activa configuración automática y descubrimiento de componentes.
SpringApplication.run | Inicia el contexto de aplicación y el servidor.
''')
add('AuthController.java', 'Recibe las credenciales y genera el token. El login usa directamente UsuarioRepository, PasswordEncoder y JwtUtil.', '''
@RequestMapping | Agrupa las rutas bajo /api/auth.
@PostMapping | Define POST /api/auth/login.
String username = | Lee username del cuerpo JSON; la línea siguiente lee password.
findByUsername | Busca la cuenta. El bloque siguiente responde 404 si no existe.
passwordEncoder.matches | Compara la contraseña recibida con BCrypt. Si falla se devuelve 401.
jwtUtil.generateToken | Emite un JWT con el nombre de usuario.
return ResponseEntity.ok | Devuelve message, username y token. No hay comprobación de rol ni de baja en el método.
''')
add('FormularioController.java', 'Expone las rutas de personas y contactos. Delega reglas en PersonaService y transforma resultados/excepciones en respuestas HTTP.', '''
@RequestMapping | Prefijo /api/formularios.
@CrossOrigin | Permite el origen localhost:4200 y los métodos/encabezados declarados.
@GetMapping("/{id}/contactos") | Consulta contactos de una persona identificada por la URL.
@PutMapping("/{id}/contactos") | Recibe una lista de ContactoDTO para guardarla.
obtenerFormularios() | Lista activos; captura RuntimeException como 500 con texto.
guardarFormulario( | Recibe FormularioDTO, devuelve 201 y convierte RuntimeException en 400.
actualizarFormulario( | Actualiza por ID; devuelve 200 o 404 ante RuntimeException, incluso cuando es un error de validación.
eliminarFormulario( | Baja lógica: 204 sin cuerpo, o 404 si se captura una excepción.
''')
add('OcupacionController.java', 'Consulta el catálogo directamente a través de su repositorio.', '''
@RequestMapping | Ruta /api/ocupaciones.
@GetMapping | Define la consulta GET.
findAll() | Lee y devuelve todas las ocupaciones con 200.
''')
add('PersonaService.java', 'Reglas, transacciones y conversiones del formulario. El alta actual reúne dos contactos, dos correos y dos teléfonos. Actualizar modifica datos y comunicaciones; los contactos se editan en su ruta específica.', '''
obtenerContactos(Long | Busca una persona activa y convierte sus contactos a DTO; devuelve 404 si falta o está dada de baja. Tiene transacción de solo lectura.
guardarContactos(Long | Valida dos contactos y los guarda dentro de una transacción.
for (int i = 0; i < 2; i++) | Actualiza o añade los dos primeros contactos; no elimina un tercero preexistente.
obtenerTodos() | Lista personas con fechaBaja nula y las transforma a FormularioDTO.
public FormularioDTO guardar( | Alta transaccional: valida contactos y comunicaciones antes de consultar o escribir.
personasActivas >= 20 | Rechaza el alta cuando ya hay 20 activos. No hay bloqueo que garantice el límite ante altas concurrentes.
for (var datos : dto.getContactosEmergencia()) | Construye ambos contactos, asigna el padre y recorta nombre/parentesco.
saveAndFlush(persona) | Guarda y fuerza la sincronización con la base dentro de la transacción del alta; las relaciones se propagan por cascada.
public FormularioDTO actualizar( | Actualización transaccional. Exige comunicaciones completas; no filtra personas dadas de baja ni actualiza contactos de emergencia.
actualizarComunicacion(persona, dto) | Crea posiciones faltantes o modifica los dos primeros correos/teléfonos.
setFechaBaja(LocalDate.now()) | Marca la baja lógica conservando el registro.
private FormularioDTO convertirADTO | Prepara la respuesta con datos personales, ocupación y los campos singulares del primer contacto.
dto.setCorreosAdicionales | Devuelve los correos después del primero. La línea siguiente hace lo mismo con teléfonos; no rellena la lista contactosEmergencia.
private Persona convertirAEntidad | Construye una entidad nueva, resuelve la ocupación y prepara comunicaciones. Los contactos se añaden en guardar.
La ocupación es obligatoria | Rechaza nombre de ocupación vacío/nulo al crear; luego busca o crea el catálogo.
private void validarContactos | Exige dos contactos completos, nombre de hasta 150, parentesco de hasta 50 y teléfono de diez dígitos.
private void validarComunicacion | Exige una entrada secundaria de correo y otra de teléfono, además de los valores principales.
correo.length() > 150 | Valida formato y longitud de ambos correos. PersonaCorreo mapea longitud 100: existe una diferencia con esta regla y el SQL.
Los dos teléfonos deben | Mensaje de rechazo si cualquiera de los teléfonos no contiene exactamente diez dígitos.
private void actualizarComunicacion | Recorre dos posiciones, crea hijos faltantes y asigna el padre; no elimina valores adicionales preexistentes.
''')
add('SecurityConfig.java', 'Configura la cadena de seguridad y los beans de autenticación.', '''
@EnableWebSecurity | Habilita esta configuración de seguridad.
.csrf( | Desactiva protección CSRF.
.cors( | Habilita integración CORS.
SessionCreationPolicy.STATELESS | No mantiene la autenticación en una sesión HTTP de Spring Security.
.requestMatchers(org.springframework.http.HttpMethod.OPTIONS | Permite OPTIONS.
.requestMatchers("/api/auth/**") | Permite rutas de autenticación en esta cadena. ApiAuthFilter exceptúa exactamente login.
.anyRequest().authenticated() | El resto exige identidad autenticada, sin una condición de rol.
.addFilterBefore | Añade JwtFilter antes del filtro username/password. ApiAuthFilter se inyecta pero no se añade explícitamente aquí.
public UserDetailsService | Devuelve un servicio que rechaza consultas; el login se resuelve en el controlador.
return new BCryptPasswordEncoder | Proporciona el comparador/codificador BCrypt.
''')
add('JwtUtil.java', 'Firma y analiza JWT con HS256. No consulta cuentas en la base.', '''
@Value | Lee jwt.secret desde configuración.
EXPIRATION_TIME = | Vigencia fija de 3600000 milisegundos: una hora.
Keys.hmacShaKeyFor | Crea la clave a partir de los bytes UTF-8 del secreto.
.setSubject | Coloca el username como sujeto.
.setExpiration | Calcula el vencimiento desde la hora actual.
.signWith | Firma con HS256.
.parseClaimsJws | Analiza y verifica firma y vencimiento; después obtiene el sujeto. Un token incorrecto produce excepción.
''')
add('JwtFilter.java', 'Construye la autenticación que Spring Security utiliza para permitir las rutas protegidas.', '''
@Component | Registra el filtro como componente administrado por Spring.
String authHeader | Lee Authorization.
token = authHeader.substring(7) | Retira el prefijo Bearer y conserva el JWT.
username = jwtUtil.extractUsername | Verifica el token y obtiene el usuario. Los errores se capturan y registran en consola.
if (username != null | Crea autenticación solo si hay sujeto y el contexto aún no tiene una.
Collections.emptyList() | Construye autenticación sin autoridades/roles.
SecurityContextHolder.getContext().setAuthentication | Guarda la identidad en el contexto para las siguientes reglas de seguridad.
filterChain.doFilter | Continúa la cadena; las reglas posteriores decidirán el acceso cuando no hubo autenticación.
''')
add('ApiAuthFilter.java', 'Añade encabezados CORS y otra comprobación de JWT para rutas API. No establece identidad en SecurityContextHolder.', '''
@Component | Puede registrarse como filtro del contenedor por Spring Boot, aunque no aparezca en addFilterBefore. No debe considerarse inactivo.
public ApiAuthFilter | Recibe JwtUtil por constructor.
protected void doFilterInternal | Recibe petición, respuesta y la cadena que puede continuar.
equals(request.getHeader("Origin")) | Añade permisos CORS solo para el origen localhost:4200.
response.addHeader("Vary" | Indica a cachés que la respuesta depende del origen.
request.getHeader("Access-Control-Request-Method") | Reconoce preconsulta CORS del origen admitido; responde 204 y termina.
String path = | Obtiene la ruta solicitada.
path.startsWith("/api/") | Revisa rutas API, exceptuando OPTIONS y exactamente /api/auth/login.
authorization.startsWith("Bearer ") | Exige encabezado y prefijo; a continuación analiza el JWT y exige sujeto no nulo.
response.setStatus(401) | Ante error devuelve 401 sin cuerpo y termina.
chain.doFilter | Continúa al siguiente filtro/controlador. Si Spring Security rechazó antes, la solicitud puede no llegar a este filtro.
''')
add('FormularioDTO.java', 'Contrato JSON del formulario. Contiene datos personales, comunicación principal/secundaria y una lista de contactos para el alta; conserva los campos singulares del primer contacto para la respuesta.', '''
private java.util.List<String> correosAdicionales | Lista secundaria inicialmente vacía. El servicio exige exactamente un elemento en alta y actualización.
private java.util.List<String> telefonosAdicionales | Lista secundaria de teléfonos, también obligatoria con un elemento.
private java.util.List<ContactoDTO> contactosEmergencia | Lista exigida con dos contactos en alta. convertirADTO no la rellena en respuesta.
private Long id | Identificador de persona.
private String email | Correo principal; telefono es el teléfono principal.
aceptaTerminos = true | Valor predeterminado no validado ni persistido por el servicio actual.
private String contactoEmergenciaNombre | Inicio de los campos singulares de contacto: nombre, teléfono y parentesco.
public Long getId() | Getters/setters exponen los datos; no aplican reglas de negocio por sí solos.
''')
add('ContactoDTO.java', 'Datos intercambiados en la lista de contactos del alta y las rutas específicas.', '''
public record | Java genera constructor y accesores de nombre, teléfono y parentesco. PersonaService valida el contenido.
''')
add('Persona.java', 'Entidad central con ocupación y listas de contactos, correos y teléfonos. Las tres listas se ordenan por ID ascendente.', '''
@Table | Mapea la tabla persona.
@GeneratedValue | ID generado por la base con estrategia IDENTITY.
private LocalDate fechaBaja | null representa activo para los repositorios; una fecha representa baja.
@ManyToOne | Varias personas pueden compartir ocupación.
private List<ContactoEmergencia> | Relación OneToMany, cascada ALL y eliminación de huérfanos; las anotaciones anteriores ordenan por ID.
private List<PersonaCorreo> | Lista ordenada de correos; el primero actúa como principal al construir el DTO.
private List<PersonaTelefono> | Lista ordenada de teléfonos con principal en la primera posición.
public ContactoEmergencia getContactoEmergencia | Devuelve solo el primer contacto para los campos singulares del DTO.
contactosEmergencia.clear() | El setter singular borra la colección antes de añadir su contacto; el alta actual usa directamente la lista.
''')
for name, purpose, field in [
    ('CatalogoOcupacion','Nombre de ocupación reutilizado por personas.','private String nombre'),
    ('PersonaCorreo','Correo de una persona. Column establece longitud 100, distinta del límite 150 del servicio y del esquema SQL.','private String correo'),
    ('PersonaTelefono','Teléfono de una persona; el mapeo admite 20 caracteres y el servicio exige diez dígitos.','private String telefono'),
    ('ContactoEmergencia','Datos de un contacto vinculado a persona: nombre, teléfono y parentesco.','private String nombre'),
    ('Usuario','Cuenta con username, hash y rol. No mapea id_persona aunque el script SQL lo declara obligatorio/único.','private String password')]:
    items='@Table | Identifica la tabla SQL.\n@GeneratedValue | IDENTITY delega la generación de ID en la base.\n'
    if name in ('PersonaCorreo','PersonaTelefono','ContactoEmergencia'):
        items+='@JoinColumn | id_persona contiene el vínculo al padre; ManyToOne permite varios hijos de una persona.\n'
    items+=field+' | Campo persistido; las anotaciones Column cercanas describen restricciones del mapeo.\n'
    if name=='Usuario': items+='private String rol | Guarda el rol pero el login/filtros actuales no lo verifican.\n'
    items+='public Long getId() | Inicio de accesores para leer/escribir campos; no contienen validación de negocio.'
    add(name+'.java',purpose,items)
for name,purpose,method in [('PersonaRepository','Consultas y persistencia de personas.','findByFechaBajaIsNull'),('CatalogoOcupacionRepository','Consultas y persistencia de ocupaciones.','findByNombre'),('UsuarioRepository','Consultas y persistencia de cuentas.','findByUsername')]:
    items='extends JpaRepository | Hereda save, saveAndFlush, findById, findAll y otras operaciones; el ID es Long.\n'+method+' | Spring Data deriva la consulta del nombre del método.\n'
    items+=('countByFechaBajaIsNull | Cuenta personas activas para la regla del límite.' if name=='PersonaRepository' else 'Optional< | Expresa que la búsqueda puede no encontrar coincidencia.')
    add(name+'.java',purpose,items)
add('application.properties','Configuración de conexión, clave JWT e Hibernate. Los secretos se omiten en el PDF sin alterar números de línea.', '''
spring.application.name | Nombre de aplicación.
spring.datasource.url | Conexión PostgreSQL a nomina_db.
spring.datasource.username | Usuario de la conexión.
spring.datasource.password | Contraseña configurada directamente; valor omitido en esta copia.
jwt.secret | Clave de firma configurada directamente; valor omitido.
ddl-auto | update solicita ajustar el esquema JPA; no equivale a ejecutar data.sql.
show-sql | Muestra consultas SQL.
hibernate.dialect | Dialecto PostgreSQL. No aparece habilitación de inicialización SQL automática.
''')
add('schema.sql','Crea las seis tablas si no existen. No actualiza la estructura de tablas existentes y presenta diferencias respecto de las entidades Java.', '''
CREATE TABLE IF NOT EXISTS catalogo_ocupacion | Catálogo con nombre único e ID BIGSERIAL.
CREATE TABLE IF NOT EXISTS persona ( | Datos personales y ocupación obligatoria.
fecha_baja DATE | El comentario de fecha futura activa difiere del filtro por fecha nula implementado.
CREATE TABLE IF NOT EXISTS contacto_emergencia | Referencia a persona sin unicidad: admite varios contactos pese al comentario 1 a 1.
ON DELETE CASCADE | El borrado físico del padre elimina hijos; la baja lógica del servicio no ejecuta DELETE.
CREATE TABLE IF NOT EXISTS persona_correo | Correo de hasta 150 caracteres, frente a 100 en PersonaCorreo.
CREATE TABLE IF NOT EXISTS persona_telefono | Teléfonos sin restricción de cantidad por persona.
CREATE TABLE IF NOT EXISTS usuario | Cuenta con username único y relación id_persona única/obligatoria, ausente del mapeo Java.
''')
add('data.sql','Datos iniciales: siete ocupaciones, Carlos y Laura, comunicaciones, un contacto para cada persona y dos usuarios. No demuestra que se hayan cargado en la base actual.', '''
INSERT INTO catalogo_ocupacion | Inserta siete nombres de ocupación.
ON CONFLICT (id) | Omite IDs existentes sin actualizar sus valores.
setval('catalogo_ocupacion_id_seq' | Ajusta la secuencia al máximo ID; hay operaciones equivalentes para persona y usuario.
INSERT INTO persona ( | Inserta dos personas activas con ocupación 2.
INSERT INTO persona_correo | Inserta correos; repetir el script puede duplicar contenido porque no existe unicidad sobre los valores.
INSERT INTO persona_telefono | Inserta teléfonos, con el mismo riesgo de repetición.
INSERT INTO contacto_emergencia | Inserta un contacto por persona, distinto del requisito de dos del alta HTTP actual.
INSERT INTO usuario | Inserta admin1/admin2 con hashes; no se verificó su correspondencia con la contraseña indicada en el comentario.
''')
add('pom.xml','Define versiones, dependencias y tareas de compilación y documentación con Maven.', '''
<artifactId>spring-boot-starter-parent | Hereda configuración de Spring Boot; la siguiente línea fija la versión 4.1.1.
<java.version> | Java 21.
<artifactId>spring-boot-starter-webmvc | Soporte de controladores HTTP.
<artifactId>postgresql | Driver de base de datos en ejecución.
<artifactId>spring-boot-starter-data-jpa | Persistencia JPA y repositorios.
<artifactId>jjwt-api | API JWT; después aparecen implementación y Jackson.
<artifactId>spring-boot-starter-security | Dependencia de seguridad.
<artifactId>asciidoctor-maven-plugin | Procesa documentación en prepare-package.
<artifactId>spring-boot-maven-plugin | Empaquetado y ejecución de la aplicación Spring Boot.
''')
add('HashPassword.java','Utilidad interactiva para crear un hash y guardarlo en usuario.password. No actualiza la base por sí sola.', '''
System.console() | Exige una consola interactiva.
console.readPassword("Nueva | Lee contraseña sin mostrarla; después solicita confirmación.
!Arrays.equals | Rechaza valores ausentes o diferentes.
value.isBlank() | Exige mínimo 12 caracteres y máximo 72 bytes UTF-8.
BCryptPasswordEncoder(12) | Genera e imprime BCrypt con coste 12.
Arrays.fill(password | Limpia arrays en finally; no borra el String creado previamente.
''')
add('RegistroCompletoTest.java','Nueva prueba unitaria con Mockito. Verifica validación y construcción de relaciones sin ejecutar PostgreSQL ni probar transacciones reales.', '''
mock(PersonaRepository.class) | Sustituye el repositorio por un doble de prueba.
new PersonaService() | Construye el servicio directamente, sin proxy transaccional de Spring.
ReflectionTestUtils.setField | Inyecta repositorios simulados en campos privados.
private FormularioDTO datos() | Construye comunicaciones completas y dos contactos para las pruebas.
rechazaRegistroSinDosContactosAntesDeEscribir | Comprueba rechazo de contactos vacíos y ausencia de interacciones con repositorios.
guardaPersonaConDosContactosYDevuelveSecundarios | Simula catálogo/guardado; comprueba dos elementos por relación, referencias al padre y listas secundarias devueltas.
rechazaTelefonoSecundarioInvalido | Rechaza teléfono secundario corto antes de consultar o guardar.
''')
add('DemoApplicationTests.java','Pruebas de integración antiguas: importan AuthService ausente y sus formularios no satisfacen los nuevos datos obligatorios. No constituyen evidencia de funcionamiento actual.', '''
import com.example.demo.service.AuthService | Clase inexistente en las fuentes; impide compilar pruebas.
@EnabledIfEnvironmentVariable | Condiciona ejecución a TEST_DATABASE_URL local con base nomina_backend_test; no evita compilar referencias.
ddl-auto=create-drop | Crea/elimina tablas al ejecutar esta prueba.
TRUNCATE TABLE | Vacía tablas antes de cada prueba: requiere base desechable.
void addsPreviouslyMissing | Espera conservar datos con nulos; ahora la actualización exige comunicación completa y dos valores.
void simultaneousCreates | Espera control concurrente del límite no implementado mediante bloqueo.
void failedCreate | Intenta comprobar rollback. Hay transacción en el alta actual, pero su fixture falla antes por datos obligatorios faltantes.
void loginAndExisting | Depende de AuthService y comprobación de roles/baja ausentes del flujo actual.
void invalidBirthDate | Espera validación de fecha futura no implementada.
private FormularioDTO formulario | Fixture incompleto: no incluye comunicaciones ni contactos que exige el alta actual.
''')
add('maven-wrapper.properties','Distribución Maven usada por los lanzadores.', '''
wrapperVersion | Versión del wrapper.
distributionType | Modo only-script.
distributionUrl | URL de la distribución Maven.
''')
add('mvnw.cmd','Lanzador Windows: una entrada batch ejecuta PowerShell para localizar o descargar Maven y pasarle argumentos.', '''
@FOR /F | Ejecuta la sección PowerShell del archivo.
$distributionUrl = | Lee la URL de propiedades del wrapper.
if (Test-Path -Path "$MAVEN_HOME" | Reutiliza distribución existente en caché.
$webclient.DownloadFile | Descarga Maven si falta.
$distributionSha256Sum = | Lee checksum opcional y lo verifica si está configurado.
Expand-Archive | Extrae la distribución descargada.
Write-Output "MVN_CMD= | Comunica la ruta de ejecución a batch.
''')
add('mvnw','Lanzador para Unix y shells compatibles: descubre Java, reutiliza o descarga Maven y ejecuta sus argumentos.', '''
set_java_home() | Localiza Java.
done <"$scriptDir/.mvn/wrapper | Lee configuración del wrapper.
exec_maven() | Función que invoca Maven.
if [ -d "$MAVEN_HOME" ] | Detecta distribución ya instalada.
command -v wget | Selecciona descarga por wget; después considera curl y Java.
if [ -n "${distributionSha256Sum-}" ] | Verifica checksum solo si está configurado.
exec_maven "$@" | Invoca Maven; la primera coincidencia pertenece a la rama de caché.
''')
add('.gitignore','Exclusiones para archivos locales y generados; no elimina archivos ya versionados.', '''
target/ | Excluye resultados de compilación.
.mvn/wrapper/maven-wrapper.jar | Excluye el binario del wrapper.
.idea | Excluye configuración IntelliJ.
.vscode/ | Excluye configuración VS Code.
''')
add('.gitattributes','Reglas de Git para finales de línea.', '''
/mvnw | Fuerza LF en el lanzador Unix.
*.cmd | Fuerza CRLF en comandos Windows.
''')
add('README.md','Guía operativa del backend actual, ejemplo completo de alta, limitaciones y mapa de archivos. No es código ejecutable.', '''
## Funcionamiento | Flujo y responsabilidades.
## Configuración | Preparación y arranque.
## Autenticación | Login, JWT y alcance real de comprobaciones.
## Rutas | Operaciones y códigos de respuesta.
## Registro y actualización | Nuevos requisitos de contactos y comunicaciones; ejemplo JSON.
## SQL | Relación entre scripts y entidades.
## Generar un hash | Uso de la utilidad BCrypt.
## Pruebas existentes | Nueva prueba unitaria y problemas de la suite antigua.
## Documentación PDF | Ubicación y regeneración de la guía.
''')

add('CatalogoParentesco.java', 'Entidad del catálogo de parentescos.', '@Table | Tabla catalogo_parentesco.\n@GeneratedValue | ID generado.\n@Column | Nombre obligatorio, único y de hasta 50 caracteres.')
add('CatalogoParentescoRepository.java', 'Acceso al catálogo por ID o nombre.', 'extends JpaRepository | Hereda operaciones de catálogo.\nfindByNombre | Busca un nombre exacto para resolver el vínculo.')
add('ParentescoController.java', 'Expone el catálogo al frontend.', '@RequestMapping | Ruta protegida /api/parentescos.\n@GetMapping | Consulta HTTP GET.\nreturn parentescos.findAll | Devuelve catálogo ordenado por ID.')
add('JwtUtilTest.java', 'Prueba de duración del token y sujeto.', 'void tokenDuraUnaHoraYConservaUsuario | Genera JWT y analiza sus fechas y usuario.\nassertEquals(3600000L | Verifica una hora exacta entre emisión y vencimiento.')

assert {p for p,_,_ in ENTRIES} == set(FILES), 'La guía debe cubrir todos los archivos del inventario'

def resolve(entry):
    path,purpose,points=entry
    raw=(ROOT/path).read_bytes()
    lines=raw.decode('utf-8-sig').splitlines()
    refs=[]
    for needle,description in points:
        found=[n for n,line in enumerate(lines,1) if needle in line]
        assert found, (path,needle)
        refs.append((found[0],needle,description))
    return path,purpose,lines,refs,hashlib.sha256(raw).hexdigest()

# Actualizar primero README para que sus referencias y hash pertenezcan al resultado final.
marker='<!-- GUIA_ARCHIVOS -->'
base=(ROOT/'README.md').read_text(encoding='utf-8-sig').split(marker)[0].rstrip()
guide=['',marker,'','## Guía de archivos y líneas','', 'Referencias calculadas sobre las fuentes actuales. En IntelliJ, Ctrl+G permite ir a una línea. El PDF incluye código numerado.','']
for entry in ENTRIES:
    if entry[0]=='README.md': continue
    path,purpose,lines,refs,_=resolve(entry)
    guide += [f'### {Path(path).name}', '', f'Archivo: [{path}]({path}). {len(lines)} líneas.', '',purpose,'']
    for n,_,description in refs: guide.append(f'- Línea {n}: {description}')
    guide.append('')
guide += ['### README.md','','Este archivo reúne la explicación operativa y esta guía. Las referencias de sus secciones se incluyen en el capítulo README.md del PDF.','','### Entregables documentales','','- `docs/generar_guia.py`: descripciones revisadas, resolución de líneas, generación de README/PDF y comprobaciones.','- `docs/referencias_backend.json`: manifiesto con hashes SHA-256 y referencias de la revisión.','- `docs/Guia_backend_archivos_y_lineas.pdf`: documento final con índice y código numerado.','','Las carpetas `.git`, `.idea` y `target` contienen metadatos o resultados generados y no forman parte de los archivos fuente explicados.','']
(ROOT/'README.md').write_text(base+'\n'+'\n'.join(guide),encoding='utf-8')
resolved=[resolve(e) for e in ENTRIES]
stamp=datetime.now().strftime('%d/%m/%Y %H:%M')
pdfmetrics.registerFont(TTFont('Body','C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('Strong','C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFont(TTFont('Code','C:/Windows/Fonts/consola.ttf'))
styles={
 'body':ParagraphStyle('body',fontName='Body',fontSize=10,leading=14,spaceAfter=8),
 'title':ParagraphStyle('title',fontName='Strong',fontSize=18,leading=23,spaceAfter=14),
 'sub':ParagraphStyle('sub',fontName='Strong',fontSize=11,leading=15,spaceBefore=10,spaceAfter=7,keepWithNext=True),
 'small':ParagraphStyle('small',fontName='Body',fontSize=8,leading=11,spaceAfter=6,wordWrap='CJK'),
 'code':ParagraphStyle('code',fontName='Code',fontSize=7,leading=9),
}
def para(text,style='body'): return Paragraph(escape(text),styles[style])
story=[Spacer(1,65),para('Guía del backend','title'),para('Todos los archivos y sus líneas importantes','title'),para('Revisión: '+stamp),para(f'{len(resolved)} archivos · Java 21 · Spring Boot · PostgreSQL'),Spacer(1,18),para('Actualización: contactos como personas compartidas, mínimo uno sin máximo; parentesco por relación, distinción de titulares y JWT de una hora.'),para('Cada capítulo identifica ruta, responsabilidad y líneas verificadas del archivo actual. Los números cuentan también líneas vacías. Si una línea larga se divide visualmente, solo el primer renglón lleva número.'),para('El código se reproduce con numeración. Contraseña de base, clave JWT y hashes se omiten en la copia. Las sangrías excesivas de SQL se reducen sin alterar números de línea. README y lanzadores Maven se muestran con extractos.'),para('Método: lectura estática. Se ejecutaron 22 pruebas y se verificaron los SQL en PostgreSQL temporal, sin modificar nomina_db. Se cubren fuentes, pruebas, scripts, configuración y README; no metadatos de Git/IDE ni target. El generador, manifiesto y PDF son entregables nuevos.'),PageBreak(),para('Funcionamiento y cambios actuales','title')]
for text in [
 'Frontend → filtros → controlador → servicio → repositorio → PostgreSQL. El DTO transporta datos; la entidad modela su persistencia.',
 'AuthController compara BCrypt. JwtUtil emite tokens de una hora y JwtFilter establece autenticación; no comprueba rol/baja de la cuenta.',
 'guardar exige mínimo un contacto, comunicaciones completas y máximo 20 titulares activos. Crea personas o reutiliza IDs, vincula parentescos y persiste transaccionalmente. No hay bloqueo concurrente del contador.',
 'actualizar exige correo y teléfono principal y secundario. Crea las posiciones faltantes y modifica las dos primeras. No cambia contactos: para ello se utiliza la ruta específica de contactos.',
 'La respuesta contiene comunicaciones, lista completa de contactos con sus IDs y campos singulares del primero. PUT de contactos reemplaza los vínculos sin eliminar personas compartidas.',
 'Los contactos tienen fecha y ocupación opcionales; es_titular los distingue del registro principal. Correo/teléfono se alinearon con SQL. Usuario todavía no mapea id_persona.',
 'Validación: 22 pruebas aprobadas (14 unitarias del servicio, una de JWT y siete con PostgreSQL temporal).',
 'El README contiene el ejemplo JSON actualizado, rutas y configuración. Para encontrar una referencia, abrir la ruta del capítulo en IntelliJ y pulsar Ctrl+G con el número indicado.'
]: story.append(para(text))
story += [PageBreak(),para('Índice navegable','title')]
for i,(path,*_) in enumerate(resolved,1): story.append(Paragraph(f'<link href="#f{i}" color="#185980">{i:02d}. {escape(path)}</link>',styles['small']))
for i,(path,purpose,lines,refs,digest) in enumerate(resolved,1):
    story += [PageBreak(),Paragraph(f'<a name="f{i}"/>{i:02d}. {escape(Path(path).name)}',styles['title']),para(path,'small'),para(f'{len(lines)} líneas originales. SHA-256 de revisión: {digest[:16]}…','small'),para(purpose),para('Líneas importantes','sub')]
    for n,_,description in refs: story.append(Paragraph(f'<b>Línea {n}.</b> {escape(description)}',styles['body']))
    excerpts=path in ('README.md','mvnw','mvnw.cmd')
    selected=sorted({k for n,_,_ in refs for k in range(n,min(n+3,len(lines))+1)}) if excerpts else range(1,len(lines)+1)
    story.append(para('Extractos numerados' if excerpts else 'Código numerado','sub'))
    previous=0
    for n in selected:
        if excerpts and previous and n!=previous+1: story.append(para('…','small'))
        line=lines[n-1].expandtabs(4)
        if path.endswith('application.properties') and line.startswith(('jwt.secret=','spring.datasource.password=')): line=line.split('=',1)[0]+'=<VALOR OMITIDO>'
        line=re.sub(r'\$2[aby]\$[^\s\x27\x22]+','<HASH OMITIDO>',line)
        line=''.join(c if ord(c)<65536 and c not in '\u2705\u274c\u26a0\ufe0f' else '[icono]' for c in line)
        if path.endswith('.sql'): line=line.lstrip()
        wrapped=textwrap.wrap(line,100,replace_whitespace=False,drop_whitespace=False) or ['']
        rows=[f'{n:4d} | '+wrapped[0]]+['     | '+x for x in wrapped[1:]]
        story.append(Preformatted('\n'.join(rows),styles['code']))
        previous=n

def footer(canvas,doc):
    canvas.setFont('Body',8)
    canvas.drawString(42,26,'Guía del backend · '+stamp)
    canvas.drawRightString(A4[0]-42,26,str(doc.page))

pdf=OUT/'Guia_backend_archivos_y_lineas.pdf'
SimpleDocTemplate(str(pdf),pagesize=A4,leftMargin=42,rightMargin=42,topMargin=42,bottomMargin=52,title='Guía del backend: archivos y líneas',author='Proyecto demo').build(story,onFirstPage=footer,onLaterPages=footer)
manifest=[{'archivo':p,'lineas':len(ls),'sha256':h,'referencias':[{'linea':n,'ancla':a,'explicacion':d} for n,a,d in rs]} for p,_,ls,rs,h in resolved]
(OUT/'referencias_backend.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
reader=PdfReader(pdf)
content='\n'.join(p.extract_text() for p in reader.pages)
assert all(p.extract_text().strip() for p in reader.pages)
assert sum(len(p.get('/Annots',[])) for p in reader.pages)>=len(resolved)
for path,_,_,_,digest in resolved:
    assert Path(path).name in content
    assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==digest, 'Cambió una fuente durante la generación'
for line in (ROOT/'src/main/resources/application.properties').read_text().splitlines():
    if line.startswith(('jwt.secret=','spring.datasource.password=')): assert line.split('=',1)[1] not in content
assert pdfmetrics.stringWidth('0'*107,'Code',7)<A4[0]-84
print(json.dumps({'archivos':len(resolved),'referencias':sum(len(r[3]) for r in resolved),'paginas':len(reader.pages),'pdf':str(pdf),'validacion':'cobertura, anclas, hashes, enlaces, texto, ancho de código y omisión de secretos'},ensure_ascii=False))
