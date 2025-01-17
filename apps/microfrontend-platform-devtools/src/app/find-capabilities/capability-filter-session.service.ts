/*
 * Copyright (c) 2018-2020 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import {Injectable} from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {Capability, Qualifier} from '@scion/microfrontend-platform';
import {expand, map, take} from 'rxjs/operators';
import {KeyValuePair, LogicalOperator} from './filter-field/filter-field';
import {DevToolsManifestService} from '../dev-tools-manifest.service';
import {Arrays} from '@scion/toolkit/util';

@Injectable({
  providedIn: 'root',
})
export class CapabilityFilterSession {
  private readonly defaultLogicalOperator: LogicalOperator = 'or';
  private _typeFilters = new Set<string>();
  private _qualifierFilters = new Array<KeyValuePair>();
  private _appFilters = new Set<string>();
  private _typeLogicalOperator: LogicalOperator;
  private _qualifierLogicalOperator: LogicalOperator;
  private _appLogicalOperator: LogicalOperator;
  private _filterChange$ = new Subject<void>();

  constructor(private _manifestService: DevToolsManifestService) {
    this.typeLogicalOperator = this.defaultLogicalOperator;
    this.qualifierLogicalOperator = this.defaultLogicalOperator;
    this.appLogicalOperator = this.defaultLogicalOperator;
  }

  public set typeLogicalOperator(value: LogicalOperator) {
    this._typeLogicalOperator = value;
    this._filterChange$.next();
  }

  public get typeLogicalOperator(): LogicalOperator {
    return this._typeLogicalOperator;
  }

  public set qualifierLogicalOperator(value: LogicalOperator) {
    this._qualifierLogicalOperator = value;
    this._filterChange$.next();
  }

  public get qualifierLogicalOperator(): LogicalOperator {
    return this._qualifierLogicalOperator;
  }

  public set appLogicalOperator(value: LogicalOperator) {
    this._appLogicalOperator = value;
    this._filterChange$.next();
  }

  public get appLogicalOperator(): LogicalOperator {
    return this._appLogicalOperator;
  }

  public capabilities$(): Observable<Capability[]> {
    return this._manifestService.capabilities$()
      .pipe(
        expand(capabilities => this._filterChange$.pipe(take(1), map(() => capabilities))),
        map(capabilities => this.filter(capabilities)),
      );
  }

  private filter(capabilities: Capability[]): Capability[] {
    return capabilities
      .filter(capability => this._typeFilters.size === 0 || this.filterByType(capability))
      .filter(capability => this._qualifierFilters.length === 0 || this.filterByQualifier(capability.qualifier))
      .filter(capability => this._appFilters.size === 0 || this.filterAppByName(capability))
      .sort(capabilityComparator);
  }

  private filterByType(capability: Capability): boolean {
    const capabilityType = capability.type.toLowerCase();
    const typeFilters = Array.from(this._typeFilters).map(typeFilter => typeFilter.toLowerCase());
    if (this._typeLogicalOperator === 'or') {
      return typeFilters.includes(capabilityType);
    }
    else if (this._typeLogicalOperator === 'and') {
      return typeFilters.every(type => type === capabilityType);
    }
    return false;
  }

  private filterByQualifier(qualifier: Qualifier): boolean {
    if (this._qualifierLogicalOperator === 'or') {
      return this._qualifierFilters.some(it => this.matchesQualifier(it, qualifier));
    }
    else if (this._qualifierLogicalOperator === 'and') {
      return this._qualifierFilters.every(it => this.matchesQualifier(it, qualifier));
    }
    return false;
  }

  private matchesQualifier(filterQualifier: KeyValuePair, qualifier: Qualifier): boolean {
    const filterKey = filterQualifier.key?.toLowerCase();
    const filterValue = filterQualifier.value?.toLowerCase();

    if (filterKey && filterValue) {
      const index = Object.keys(qualifier).map(key => key.toLowerCase()).indexOf(filterKey);
      return `${Object.values(qualifier)[index]}`.toLowerCase() === `${filterValue}`;
    }
    else if (filterKey) {
      return Object.keys(qualifier).map(key => key.toLowerCase()).includes(filterKey);
    }
    else if (filterValue) {
      return Object.values(qualifier).some(qualifierValue => `${qualifierValue}`.toLowerCase() === `${filterValue}`);
    }
    return false;
  }

  private filterAppByName(capability: Capability): boolean {
    const symbolicName = capability.metadata.appSymbolicName.toLowerCase();
    const appFilters = Array.from(this._appFilters).map(appFilter => appFilter.toLowerCase());
    if (this._appLogicalOperator === 'or') {
      return appFilters.includes(symbolicName);
    }
    else if (this._appLogicalOperator === 'and') {
      return appFilters.every(app => app === symbolicName);
    }
    return false;
  }

  public addTypeFilter(type: string): void {
    if (this._typeFilters.has(type)) {
      return;
    }
    this._typeFilters.add(type);
    this._filterChange$.next();
  }

  public removeTypeFilter(type: string): void {
    this._typeFilters.delete(type) && this._filterChange$.next();
  }

  public get typeFilters(): string[] {
    return Array.from(this._typeFilters);
  }

  public addQualifierFilter(qualifier: KeyValuePair): void {
    if (this._qualifierFilters.some(it => it.key === qualifier.key && it.value === qualifier.value)) {
      return;
    }
    this._qualifierFilters.push({
      key: qualifier.key,
      value: qualifier.value,
    });
    this._filterChange$.next();
  }

  public removeQualifierFilter(qualifier: KeyValuePair): void {
    Arrays.remove(this._qualifierFilters, filter => filter.key === qualifier.key && filter.value === qualifier.value);
    this._filterChange$.next();
  }

  public get qualifierFilters(): KeyValuePair[] {
    return this._qualifierFilters;
  }

  public addAppFilter(symbolicName: string): void {
    if (this._appFilters.has(symbolicName)) {
      return;
    }
    this._appFilters.add(symbolicName);
    this._filterChange$.next();
  }

  public removeAppFilter(symbolicName: string): void {
    this._appFilters.delete(symbolicName) && this._filterChange$.next();
  }

  public get appFilters(): string[] {
    return Array.from(this._appFilters);
  }
}

const capabilityComparator = (capability1: Capability, capability2: Capability): number => {
  return capability1.metadata.appSymbolicName.localeCompare(capability2.metadata.appSymbolicName) ||
    capability1.type.localeCompare(capability2.type);
};
