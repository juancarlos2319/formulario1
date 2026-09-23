package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "persona")
public class Persona {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false, length = 100)
    private String apellido;

    @Column(name = "fecha_nacimiento", nullable = false)
    private LocalDate fechaNacimiento;

    @Column(length = 50)
    private String genero;

    @Column(length = 255)
    private String direccion;

    @Column(length = 100)
    private String ciudad;

    @Column(name = "fecha_baja")
    private LocalDate fechaBaja;

    @ManyToOne
    @JoinColumn(name = "id_ocupacion", nullable = false)
    private CatalogoOcupacion ocupacion;

    @OneToMany(mappedBy = "persona", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<ContactoEmergencia> contactosEmergencia = new ArrayList<>();

    @OneToMany(mappedBy = "persona", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PersonaCorreo> correos = new ArrayList<>();

    @OneToMany(mappedBy = "persona", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PersonaTelefono> telefonos = new ArrayList<>();

    public Persona() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getApellido() { return apellido; }
    public void setApellido(String apellido) { this.apellido = apellido; }
    public LocalDate getFechaNacimiento() { return fechaNacimiento; }
    public void setFechaNacimiento(LocalDate fechaNacimiento) { this.fechaNacimiento = fechaNacimiento; }
    public String getGenero() { return genero; }
    public void setGenero(String genero) { this.genero = genero; }
    public String getDireccion() { return direccion; }
    public void setDireccion(String direccion) { this.direccion = direccion; }
    public String getCiudad() { return ciudad; }
    public void setCiudad(String ciudad) { this.ciudad = ciudad; }
    public LocalDate getFechaBaja() { return fechaBaja; }
    public void setFechaBaja(LocalDate fechaBaja) { this.fechaBaja = fechaBaja; }
    public CatalogoOcupacion getOcupacion() { return ocupacion; }
    public void setOcupacion(CatalogoOcupacion ocupacion) { this.ocupacion = ocupacion; }

    public List<ContactoEmergencia> getContactosEmergencia() { return contactosEmergencia; }
    public void setContactosEmergencia(List<ContactoEmergencia> contactosEmergencia) {
        this.contactosEmergencia = contactosEmergencia;
    }

    public ContactoEmergencia getContactoEmergencia() {
        return contactosEmergencia.isEmpty() ? null : contactosEmergencia.get(0);
    }

    public void addContactoEmergencia(ContactoEmergencia contacto) {
        if (contacto != null) {
            contacto.setPersona(this);
            this.contactosEmergencia.add(contacto);
        }
    }

    public List<PersonaCorreo> getCorreos() { return correos; }
    public void setCorreos(List<PersonaCorreo> correos) { this.correos = correos; }
    public List<PersonaTelefono> getTelefonos() { return telefonos; }
    public void setTelefonos(List<PersonaTelefono> telefonos) { this.telefonos = telefonos; }
}   