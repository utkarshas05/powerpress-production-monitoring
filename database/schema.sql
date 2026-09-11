--
-- PostgreSQL database dump
--

\restrict lDjyzNVdx1f0AGASwAM5alo75SzZVyZsycbKgkilYOwZUUiZ1xo0MZOq46cMQb9

-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: downtime_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.downtime_events (
    id integer NOT NULL,
    machine_id integer NOT NULL,
    reason character varying(255),
    started_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ended_at timestamp without time zone,
    duration_seconds bigint DEFAULT 0
);


--
-- Name: downtime_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.downtime_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: downtime_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.downtime_events_id_seq OWNED BY public.downtime_events.id;


--
-- Name: downtime_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.downtime_records (
    id integer NOT NULL,
    machine_id integer,
    machine_code character varying(100) NOT NULL,
    device_id character varying(100),
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone,
    duration_seconds integer DEFAULT 0 NOT NULL,
    reason character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: downtime_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.downtime_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: downtime_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.downtime_records_id_seq OWNED BY public.downtime_records.id;


--
-- Name: machine_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.machine_events (
    id integer NOT NULL,
    machine_id integer,
    machine_code character varying(100),
    device_id character varying(100),
    event_type character varying(100) NOT NULL,
    description text,
    event_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: machine_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.machine_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: machine_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.machine_events_id_seq OWNED BY public.machine_events.id;


--
-- Name: machine_runtime_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.machine_runtime_state (
    machine_id integer NOT NULL,
    machine_code character varying(100) NOT NULL,
    device_id character varying(100) NOT NULL,
    last_pulse_time timestamp without time zone,
    current_status character varying(20) DEFAULT 'OFFLINE'::character varying,
    downtime_start timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: machine_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.machine_status (
    id integer NOT NULL,
    machine_id integer NOT NULL,
    status character varying(20) NOT NULL,
    uptime_seconds bigint DEFAULT 0,
    downtime_seconds bigint DEFAULT 0,
    availability numeric(5,2) DEFAULT 0,
    cycle_count integer DEFAULT 0,
    recorded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: machine_status_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.machine_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: machine_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.machine_status_id_seq OWNED BY public.machine_status.id;


--
-- Name: machines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.machines (
    id integer NOT NULL,
    machine_code character varying(50) NOT NULL,
    machine_name character varying(100) NOT NULL,
    machine_type character varying(100) DEFAULT 'Power Press'::character varying,
    input_type character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    device_id character varying(100),
    hardware_id character varying(100)
);


--
-- Name: machines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.machines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: machines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.machines_id_seq OWNED BY public.machines.id;


--
-- Name: production_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_records (
    id integer NOT NULL,
    machine_id integer,
    machine_code character varying(100) NOT NULL,
    device_id character varying(100),
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    cycle_count integer DEFAULT 0 NOT NULL,
    jobs_per_minute numeric(10,2) DEFAULT 0 NOT NULL,
    status character varying(30) DEFAULT 'RUNNING'::character varying NOT NULL,
    pulse_received boolean DEFAULT false NOT NULL
);


--
-- Name: production_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.production_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: production_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.production_records_id_seq OWNED BY public.production_records.id;


--
-- Name: downtime_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.downtime_events ALTER COLUMN id SET DEFAULT nextval('public.downtime_events_id_seq'::regclass);


--
-- Name: downtime_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.downtime_records ALTER COLUMN id SET DEFAULT nextval('public.downtime_records_id_seq'::regclass);


--
-- Name: machine_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_events ALTER COLUMN id SET DEFAULT nextval('public.machine_events_id_seq'::regclass);


--
-- Name: machine_status id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_status ALTER COLUMN id SET DEFAULT nextval('public.machine_status_id_seq'::regclass);


--
-- Name: machines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machines ALTER COLUMN id SET DEFAULT nextval('public.machines_id_seq'::regclass);


--
-- Name: production_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_records ALTER COLUMN id SET DEFAULT nextval('public.production_records_id_seq'::regclass);


--
-- Name: downtime_events downtime_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.downtime_events
    ADD CONSTRAINT downtime_events_pkey PRIMARY KEY (id);


--
-- Name: downtime_records downtime_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.downtime_records
    ADD CONSTRAINT downtime_records_pkey PRIMARY KEY (id);


--
-- Name: machine_events machine_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_events
    ADD CONSTRAINT machine_events_pkey PRIMARY KEY (id);


--
-- Name: machine_runtime_state machine_runtime_state_machine_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_runtime_state
    ADD CONSTRAINT machine_runtime_state_machine_id_unique UNIQUE (machine_id);


--
-- Name: machine_runtime_state machine_runtime_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_runtime_state
    ADD CONSTRAINT machine_runtime_state_pkey PRIMARY KEY (machine_id);


--
-- Name: machine_status machine_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_status
    ADD CONSTRAINT machine_status_pkey PRIMARY KEY (id);


--
-- Name: machines machines_machine_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_machine_code_key UNIQUE (machine_code);


--
-- Name: machines machines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_pkey PRIMARY KEY (id);


--
-- Name: production_records production_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_records
    ADD CONSTRAINT production_records_pkey PRIMARY KEY (id);


--
-- Name: idx_downtime_machine_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_downtime_machine_id ON public.downtime_records USING btree (machine_id);


--
-- Name: idx_downtime_start_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_downtime_start_time ON public.downtime_records USING btree (start_time);


--
-- Name: idx_events_machine_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_machine_id ON public.machine_events USING btree (machine_id);


--
-- Name: idx_machines_device_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_machines_device_id ON public.machines USING btree (device_id) WHERE (device_id IS NOT NULL);


--
-- Name: idx_machines_machine_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_machines_machine_code ON public.machines USING btree (machine_code);


--
-- Name: idx_production_machine_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_machine_code ON public.production_records USING btree (machine_code);


--
-- Name: idx_production_machine_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_machine_id ON public.production_records USING btree (machine_id);


--
-- Name: idx_production_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_timestamp ON public.production_records USING btree ("timestamp");


--
-- Name: downtime_events downtime_events_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.downtime_events
    ADD CONSTRAINT downtime_events_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: downtime_records downtime_records_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.downtime_records
    ADD CONSTRAINT downtime_records_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;


--
-- Name: machine_events machine_events_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_events
    ADD CONSTRAINT machine_events_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;


--
-- Name: machine_status machine_status_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_status
    ADD CONSTRAINT machine_status_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: production_records production_records_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_records
    ADD CONSTRAINT production_records_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict lDjyzNVdx1f0AGASwAM5alo75SzZVyZsycbKgkilYOwZUUiZ1xo0MZOq46cMQb9

