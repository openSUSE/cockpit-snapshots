import React, { useCallback, useState } from 'react';

import { Button, DropdownItem, PageSection, Stack } from '@patternfly/react-core';
import { Card, CardBody, CardHeader, CardTitle } from "@patternfly/react-core/dist/esm/components/Card/index.js";
import { KebabDropdown } from "cockpit-components-dropdown";
import { ListingTable, ListingTableRowProps, RowRecord } from "cockpit-components-table.jsx";
import cockpit from 'cockpit';

import { Config, Snapshot } from './types';
import { SnapshotDiff } from './snapshot_diff';
import { useDialogs } from 'dialogs';
import { CompareDialog } from './compare_dialog';
const _ = cockpit.gettext;

export const DashboardPage = ({ hasSndiff, snapperConfigs, snapshots, snapshotsPaired }: {hasSndiff: boolean, snapperConfigs: Config[], snapshots: Snapshot[], snapshotsPaired: ([Snapshot, Snapshot] | [Snapshot])[]}) => {
    const Dialogs = useDialogs();
    const [expandedRows, setExpandedRows] = useState<RowRecord>({});

    const rollback = useCallback((snapshot: number) => {
        console.log("rolling back to", snapshot);
        cockpit.spawn(["snapper", "--json", "rollback", snapshot.toString()], { err: "message", superuser: "require" }).then((output: string) => {
            console.log(output);
        })
                        .catch(err => console.log("Rollback errored with", err));
    }, []);

    return (
        <PageSection>
            <Stack hasGutter>
                <Card>
                    <CardTitle>{_("Snapshot Configs")}</CardTitle>
                    <CardBody>
                        <ListingTable
                            columns={[
                                { title: "Config" },
                                { title: "Subvolume" },
                            ]} rows={snapperConfigs.map(config => {
                                return {
                                    columns: [
                                        {
                                            title: config.config,
                                        },
                                        {
                                            title: config.subvolume,
                                        },
                                    ],
                                    props: { key: config.config }
                                };
                            })}
                        />
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader actions={hasSndiff
                        ? {
                            actions: [
                                <Button key="compare-snapshots" onClick={() => Dialogs.show(<CompareDialog snapshots={snapshots} />)}>{_("Compare Snapshots")}</Button>
                            ]
                        }
                        : { actions: [] }}
                    >
                        <CardTitle>{_("Snapshots")}</CardTitle>
                    </CardHeader>
                    <CardBody>
                        <ListingTable
                            onExpand={(rows) => setExpandedRows(rows)}
                            columns={[
                                { title: "ID" },
                                { title: "Type" },
                                { title: "Date" },
                                { title: "Description" },
                                { title: "User Data" },
                                { title: "Actions" },
                            ]}
                            rows={snapshotsPaired.reduce((reduced_snapshots: ListingTableRowProps[], pairs: [Snapshot, Snapshot] | [Snapshot]) => {
                                const actions = (
                                    <KebabDropdown
                                        toggleButtonId="snapshot-actions"
                                        dropdownItems={
                                            pairs.length === 2
                                                ? [
                                                    <DropdownItem key={pairs[0].number.toString() + "-rollback-pre"} onClick={() => rollback(pairs[0].number)}>{_("Rollback to pre")}</DropdownItem>,
                                                    <DropdownItem key={pairs[1].number.toString() + "-rollback-post"} onClick={() => rollback(pairs[1].number)}>{_("Rollback to post")}</DropdownItem>
                                                ]
                                                : [
                                                    <DropdownItem key={pairs[0].number.toString() + "-rollback-single"} onClick={() => rollback(pairs[0].number)}>{_("Rollback to snapshot")}</DropdownItem>,
                                                ]
                                        }
                                    />
                                );

                                if (pairs[1]) {
                                    const pre = pairs[0];
                                    const post = pairs[1];
                                    const element: ListingTableRowProps = {
                                        columns: [
                                            {
                                                title: pre.number + " - " + post.number + (post.active && post.default ? " (Active + Default)" : post.active ? " (Active)" : post.default ? " (Default)" : ""),
                                            },
                                            {
                                                title: pre.type + " - " + post.type,
                                            },
                                            {
                                                title: pre.date,
                                            },
                                            {
                                                title: pre.description,
                                            },
                                            {
                                                title: JSON.stringify(pre.userdata),
                                            },
                                            {
                                                title: actions,
                                                props: { className: "pf-v6-c-table__action" }
                                            }
                                        ],
                                        props: { key: pre.number + "-" + post.number },
                                    };
                                    if (hasSndiff) {
                                        element.expandedContent = <SnapshotDiff pre_snapshot={pre.number} post_snapshot={post.number} load={expandedRows[pre.number + "-" + post.number] !== undefined} />;
                                    }
                                    reduced_snapshots.push(element);
                                } else {
                                    const snapshot = pairs[0];
                                    reduced_snapshots.push({
                                        columns: [
                                            {
                                                title: snapshot.number + (snapshot.active && snapshot.default ? " (Active + Default)" : snapshot.active ? " (Active)" : snapshot.default ? " (Default)" : ""),
                                            },
                                            {
                                                title: snapshot.type,
                                            },
                                            {
                                                title: snapshot.date,
                                            },
                                            {
                                                title: snapshot.description,
                                            },
                                            {
                                                title: JSON.stringify(snapshot.userdata),
                                            },
                                            {
                                                title: actions,
                                                props: { className: "pf-v6-c-table__action" }
                                            }
                                        ],
                                        props: { key: snapshot.number }
                                    });
                                }
                                return reduced_snapshots;
                            }, [])}
                        />
                    </CardBody>
                </Card>
            </Stack>
        </PageSection>
    );
};
