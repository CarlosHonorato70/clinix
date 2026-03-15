CREATE TABLE "agendamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"medico_id" uuid NOT NULL,
	"paciente_id" uuid NOT NULL,
	"data_hora" timestamp with time zone NOT NULL,
	"duracao_min" integer DEFAULT 30 NOT NULL,
	"tipo" varchar(30) NOT NULL,
	"status" varchar(30) DEFAULT 'agendado' NOT NULL,
	"risco_noshow" real DEFAULT 0,
	"convenio_id" uuid,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"regra_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"acao" varchar(20) NOT NULL,
	"comentario" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"usuario_id" uuid,
	"acao" varchar(50) NOT NULL,
	"entidade" varchar(50) NOT NULL,
	"entidade_id" uuid,
	"dados_antes" jsonb,
	"dados_depois" jsonb,
	"ip" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"agendamento_id" uuid,
	"paciente_id" uuid NOT NULL,
	"medico_id" uuid NOT NULL,
	"data_atendimento" timestamp with time zone DEFAULT now() NOT NULL,
	"anamnese" text,
	"exame_fisico" text,
	"hipotese_diagnostica" jsonb,
	"conduta" text,
	"prescricao" jsonb,
	"ia_extraido" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "convenio_regras_aprendidas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"convenio_id" uuid NOT NULL,
	"tuss_codigo" varchar(20),
	"cid_codigo" varchar(10),
	"tipo_regra" varchar(50) NOT NULL,
	"descricao" text NOT NULL,
	"valor_parametro" jsonb,
	"confianca" real DEFAULT 0.5 NOT NULL,
	"confirmacoes" integer DEFAULT 0 NOT NULL,
	"rejeicoes" integer DEFAULT 0 NOT NULL,
	"confirmada_por_humano" boolean DEFAULT false NOT NULL,
	"origem" varchar(30) NOT NULL,
	"ativa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "convenios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nome" varchar(200) NOT NULL,
	"codigo_ans" varchar(10),
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "glosa_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"convenio_id" uuid,
	"guia_id" uuid,
	"texto_glosa" text NOT NULL,
	"contexto" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guias_tiss" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"consulta_id" uuid,
	"convenio_id" uuid NOT NULL,
	"numero_guia" varchar(20),
	"xml_enviado" text,
	"xml_retorno" text,
	"status" varchar(30) DEFAULT 'pendente_auditoria' NOT NULL,
	"valor_faturado" numeric(10, 2),
	"valor_pago" numeric(10, 2),
	"glosa_motivo" text,
	"auditoria_ia" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guias_tiss_numero_guia_unique" UNIQUE("numero_guia")
);
--> statement-breakpoint
CREATE TABLE "lgpd_consent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"paciente_id" uuid NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"aceito" boolean NOT NULL,
	"ip_origem" varchar(45),
	"versao_termo" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pacientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"medico_responsavel_id" uuid,
	"nome" varchar(200) NOT NULL,
	"cpf" varchar(14),
	"data_nascimento" date,
	"sexo" char(1),
	"telefone" varchar(20),
	"email" varchar(200),
	"convenio_id" uuid,
	"numero_carteirinha" varchar(50),
	"alergias" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(200) NOT NULL,
	"subdominio" varchar(100) NOT NULL,
	"plano" varchar(30) DEFAULT 'trial' NOT NULL,
	"status" varchar(30) DEFAULT 'trial' NOT NULL,
	"billing_customer_id" varchar(100),
	"billing_subscription_id" varchar(100),
	"trial_ends_at" timestamp with time zone,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_subdominio_unique" UNIQUE("subdominio")
);
--> statement-breakpoint
CREATE TABLE "tuss" (
	"codigo" varchar(10) PRIMARY KEY NOT NULL,
	"descricao" text NOT NULL,
	"categoria" varchar(100),
	"vigencia_inicio" date,
	"vigencia_fim" date
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nome" varchar(200) NOT NULL,
	"email" varchar(200) NOT NULL,
	"senha_hash" text NOT NULL,
	"role" varchar(30) NOT NULL,
	"crm" varchar(30),
	"especialidade" varchar(100),
	"cor_agenda" varchar(7),
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_medico_id_usuarios_id_fk" FOREIGN KEY ("medico_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_paciente_id_pacientes_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_convenio_id_convenios_id_fk" FOREIGN KEY ("convenio_id") REFERENCES "public"."convenios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_feedback" ADD CONSTRAINT "agent_feedback_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_feedback" ADD CONSTRAINT "agent_feedback_regra_id_convenio_regras_aprendidas_id_fk" FOREIGN KEY ("regra_id") REFERENCES "public"."convenio_regras_aprendidas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_feedback" ADD CONSTRAINT "agent_feedback_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_agendamento_id_agendamentos_id_fk" FOREIGN KEY ("agendamento_id") REFERENCES "public"."agendamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_paciente_id_pacientes_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_medico_id_usuarios_id_fk" FOREIGN KEY ("medico_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "convenio_regras_aprendidas" ADD CONSTRAINT "convenio_regras_aprendidas_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "convenio_regras_aprendidas" ADD CONSTRAINT "convenio_regras_aprendidas_convenio_id_convenios_id_fk" FOREIGN KEY ("convenio_id") REFERENCES "public"."convenios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "convenios" ADD CONSTRAINT "convenios_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glosa_embeddings" ADD CONSTRAINT "glosa_embeddings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glosa_embeddings" ADD CONSTRAINT "glosa_embeddings_convenio_id_convenios_id_fk" FOREIGN KEY ("convenio_id") REFERENCES "public"."convenios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glosa_embeddings" ADD CONSTRAINT "glosa_embeddings_guia_id_guias_tiss_id_fk" FOREIGN KEY ("guia_id") REFERENCES "public"."guias_tiss"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guias_tiss" ADD CONSTRAINT "guias_tiss_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guias_tiss" ADD CONSTRAINT "guias_tiss_consulta_id_consultas_id_fk" FOREIGN KEY ("consulta_id") REFERENCES "public"."consultas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guias_tiss" ADD CONSTRAINT "guias_tiss_convenio_id_convenios_id_fk" FOREIGN KEY ("convenio_id") REFERENCES "public"."convenios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lgpd_consent" ADD CONSTRAINT "lgpd_consent_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lgpd_consent" ADD CONSTRAINT "lgpd_consent_paciente_id_pacientes_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_medico_responsavel_id_usuarios_id_fk" FOREIGN KEY ("medico_responsavel_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_convenio_id_convenios_id_fk" FOREIGN KEY ("convenio_id") REFERENCES "public"."convenios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agendamentos_medico_data_idx" ON "agendamentos" USING btree ("tenant_id","medico_id","data_hora");--> statement-breakpoint
CREATE INDEX "agendamentos_paciente_idx" ON "agendamentos" USING btree ("paciente_id");--> statement-breakpoint
CREATE INDEX "consultas_paciente_idx" ON "consultas" USING btree ("paciente_id");--> statement-breakpoint
CREATE INDEX "consultas_medico_idx" ON "consultas" USING btree ("medico_id");--> statement-breakpoint
CREATE INDEX "regras_convenio_ativa_idx" ON "convenio_regras_aprendidas" USING btree ("convenio_id","ativa","confianca");--> statement-breakpoint
CREATE INDEX "guias_tiss_tenant_status_idx" ON "guias_tiss" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "pacientes_tenant_nome_idx" ON "pacientes" USING btree ("tenant_id","nome");--> statement-breakpoint
CREATE INDEX "usuarios_tenant_email_idx" ON "usuarios" USING btree ("tenant_id","email");