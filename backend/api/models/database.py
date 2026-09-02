"""
MPLADS Monitor — Database Models & Connection
=============================================
SQLAlchemy ORM models for all MPLADS entities.
"""

from datetime import datetime, date
from typing import Optional
from sqlalchemy import (
    create_engine, Column, Integer, String, Numeric,
    Boolean, Date, DateTime, Text, ForeignKey, Index, JSON
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.dialects.postgresql import JSONB
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings

Base = declarative_base()

# ─────────────────────────────────────────────────────────────────────────────
# Core Tables
# ─────────────────────────────────────────────────────────────────────────────

class MasterProject(Base):
    """
    Unified project record merging all MPLADS lifecycle datasets.
    Each row represents one recommended work at its most recent lifecycle stage.
    
    NOTE: No persistent work_id exists in the MPLADS portal.
    internal_key is a composite match key (approximate, may have collisions).
    """
    __tablename__ = "master_projects"

    project_id = Column(Integer, primary_key=True, autoincrement=True)
    internal_key = Column(String(512), index=True)  # composite match key

    # Parliament
    house_type = Column(String(10))          # LOK / RAJYA
    tenure_id = Column(String(20))
    tenure_name = Column(String(100))

    # MP & Location
    state_name = Column(String(100), index=True)
    constituency_name = Column(String(200), index=True)
    mp_name = Column(String(300), index=True)
    city_name = Column(String(200))
    block_name = Column(String(200))
    village_name = Column(String(200))
    location_type = Column(String(50))       # Rural / Urban
    ida_name = Column(String(300), index=True)  # Implementing District Authority

    # Financial (raw from API)
    allocated_amount = Column(Numeric(15, 2))
    available_limit = Column(Numeric(15, 2))
    expenditure_amt = Column(Numeric(15, 2))

    # Dates
    recommended_date = Column(Date, index=True)
    actual_end_date = Column(Date)           # NULL if not completed

    # Status
    work_status = Column(String(100))
    dataset_source = Column(String(50))      # Rural/Urban/OnGoing/Completed/Unsanctioned
    letter_no = Column(String(100))

    # ── Derived Features ──────────────────────────────────────────────────────
    expenditure_ratio = Column(Numeric(8, 4))    # expenditure / allocated
    cost_variance_pct = Column(Numeric(8, 4))    # % over/under spend
    project_age_days = Column(Integer)           # days since recommendation
    days_to_complete = Column(Integer)           # NULL if not completed
    is_completed = Column(Boolean, default=False)
    is_ongoing = Column(Boolean, default=False)
    is_unsanctioned = Column(Boolean, default=False)
    is_calamity = Column(Boolean, default=False)
    is_overdue = Column(Boolean, default=False)  # ongoing > 365 days
    is_stalled = Column(Boolean, default=False)  # no completion > 730 days

    # ── Peer Comparison Features ──────────────────────────────────────────────
    district_median_amount = Column(Numeric(15, 2))
    state_median_amount = Column(Numeric(15, 2))
    mp_median_amount = Column(Numeric(15, 2))
    amount_vs_district_pct = Column(Numeric(8, 4))  # % deviation from district median
    amount_vs_state_pct = Column(Numeric(8, 4))     # % deviation from state median
    mp_project_count = Column(Integer)              # projects per MP in tenure
    constituency_project_count = Column(Integer)

    # ── Risk Scores (0–100 each) ──────────────────────────────────────────────
    financial_risk_score = Column(Numeric(5, 2), default=0)
    delay_risk_score = Column(Numeric(5, 2), default=0)
    expenditure_risk_score = Column(Numeric(5, 2), default=0)
    duplicate_risk_score = Column(Numeric(5, 2), default=0)
    peer_deviation_score = Column(Numeric(5, 2), default=0)
    ml_anomaly_score = Column(Numeric(5, 2), default=0)
    overall_risk_score = Column(Numeric(5, 2), default=0, index=True)
    risk_band = Column(String(20), index=True)   # LOW/MODERATE/HIGH/CRITICAL
    risk_flags = Column(JSON)                     # list of flag dicts

    # ── Model Metadata ────────────────────────────────────────────────────────
    ingested_at = Column(DateTime, default=datetime.utcnow)
    scored_at = Column(DateTime)
    model_version = Column(String(50))
    rules_version = Column(String(50))

    # Relationships
    anomalies = relationship("AnomalyResult", back_populates="project",
                             cascade="all, delete-orphan")
    audit_cases = relationship("AuditCase", back_populates="project",
                               cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_risk_state", "state_name", "overall_risk_score"),
        Index("ix_risk_mp", "mp_name", "overall_risk_score"),
        Index("ix_risk_ida", "ida_name", "overall_risk_score"),
    )


class MpAllocation(Base):
    """MP fund allocation per tenure."""
    __tablename__ = "mp_allocations"

    allocation_id = Column(Integer, primary_key=True, autoincrement=True)
    house_type = Column(String(10))
    state_name = Column(String(100), index=True)
    constituency_name = Column(String(200))
    mp_name = Column(String(300), index=True)
    allocated_amount = Column(Numeric(15, 2))
    tenure_id = Column(String(20))
    ingested_at = Column(DateTime, default=datetime.utcnow)


class CalamityConsent(Base):
    """Calamity-related consented fund amounts."""
    __tablename__ = "calamity_consents"

    consent_id = Column(Integer, primary_key=True, autoincrement=True)
    calamity_type = Column(String(100))
    calamity_name = Column(String(200))
    mp_name = Column(String(300))
    consent_date = Column(Date)
    consent_amount = Column(Numeric(15, 2))
    ingested_at = Column(DateTime, default=datetime.utcnow)


class AnomalyResult(Base):
    """
    Individual anomaly detection results per project.
    Each row = one flag (rule / ML / similarity).
    """
    __tablename__ = "anomaly_results"

    result_id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("master_projects.project_id", ondelete="CASCADE"),
                        index=True)
    detection_type = Column(String(50))    # RULE / ML / SIMILARITY
    rule_name = Column(String(100))
    severity = Column(String(20))          # LOW/MODERATE/HIGH/CRITICAL
    score_contribution = Column(Numeric(5, 2))
    explanation = Column(Text)
    evidence_json = Column(JSON)
    detected_at = Column(DateTime, default=datetime.utcnow)
    model_version = Column(String(50))

    project = relationship("MasterProject", back_populates="anomalies")


class DuplicatePair(Base):
    """
    Detected similar/potentially duplicate project pairs.
    NOTE: Similarity is NOT confirmed duplication. Requires human review.
    """
    __tablename__ = "duplicate_pairs"

    pair_id = Column(Integer, primary_key=True, autoincrement=True)
    project_id_a = Column(Integer, ForeignKey("master_projects.project_id", ondelete="CASCADE"))
    project_id_b = Column(Integer, ForeignKey("master_projects.project_id", ondelete="CASCADE"))
    similarity_score = Column(Numeric(5, 4))
    match_factors = Column(JSON)     # dict of matched fields and scores
    detected_at = Column(DateTime, default=datetime.utcnow)


class AuditCase(Base):
    """
    Auto-generated investigation card for high-risk projects.
    DISCLAIMER: These are risk indicators, NOT fraud findings.
    """
    __tablename__ = "audit_cases"

    case_id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("master_projects.project_id", ondelete="CASCADE"),
                        index=True)
    priority = Column(String(20))       # LOW/MODERATE/HIGH/CRITICAL
    summary = Column(Text)
    anomalies = Column(JSON)
    evidence = Column(JSON)
    recommended_action = Column(Text)
    disclaimer = Column(Text, default=(
        "DISCLAIMER: This investigation card is generated by an AI-assisted risk "
        "prioritization system. It identifies patterns that warrant human attention. "
        "These are RISK INDICATORS, not findings of fraud or misconduct. "
        "All flagged cases MUST be reviewed by qualified human auditors "
        "before any action is taken."
    ))
    generated_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("MasterProject", back_populates="audit_cases")


# ─────────────────────────────────────────────────────────────────────────────
# Database Engine & Session
# ─────────────────────────────────────────────────────────────────────────────

def get_engine():
    return create_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        echo=settings.debug,
    )


def get_session_factory(engine=None):
    if engine is None:
        engine = get_engine()
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_tables(engine=None):
    """Create all tables if they don't exist."""
    if engine is None:
        engine = get_engine()
    Base.metadata.create_all(bind=engine)
    print("[DB] Tables created successfully.")


def get_db():
    """FastAPI dependency for database sessions."""
    SessionLocal = get_session_factory()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
